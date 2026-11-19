


SET statement_timeout = 0;
SET lock_timeout = 0;
SET idle_in_transaction_session_timeout = 0;
SET client_encoding = 'UTF8';
SET standard_conforming_strings = on;
SELECT pg_catalog.set_config('search_path', '', false);
SET check_function_bodies = false;
SET xmloption = content;
SET client_min_messages = warning;
SET row_security = off;


CREATE SCHEMA IF NOT EXISTS "public";


ALTER SCHEMA "public" OWNER TO "pg_database_owner";


COMMENT ON SCHEMA "public" IS 'standard public schema';



CREATE TYPE "public"."budget_type" AS ENUM (
    'income',
    'expenses',
    'savings'
);


ALTER TYPE "public"."budget_type" OWNER TO "postgres";


CREATE TYPE "public"."currency_code" AS ENUM (
    'USD',
    'RON',
    'EUR'
);


ALTER TYPE "public"."currency_code" OWNER TO "postgres";


CREATE TYPE "public"."language_code" AS ENUM (
    'ro',
    'en'
);


ALTER TYPE "public"."language_code" OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."generate_due_recurring"() RETURNS "void"
    LANGUAGE "sql"
    AS $$
  WITH due AS (
    SELECT r.*, c.name AS category
    FROM recurring_items r
    JOIN categories c USING (category_id)
    WHERE r.is_active
      AND r.next_run <= (now() AT TIME ZONE 'Europe/Bucharest')::date
  ),
  added AS (
    INSERT INTO budget_items (user_id, type, category_id, amount, date, notes, recurring_id)
    SELECT user_id, type, category_id, amount, next_run, notes, id FROM due
    ON CONFLICT (recurring_id, date) WHERE recurring_id IS NOT NULL DO NOTHING
    RETURNING item_id, recurring_id, date
  ),
  notified AS (
    INSERT INTO notifications (user_id, type, data)
    SELECT d.user_id, 'recurring_added',
           jsonb_build_object('item_id', a.item_id, 'amount', d.amount,
                              'category', d.category, 'date', a.date)
    FROM added a
    JOIN due d ON d.id = a.recurring_id
  )
  -- luna următoare, în ziua aleasă (29-31 = ultima zi în lunile mai scurte)
  UPDATE recurring_items r
  SET next_run = (date_trunc('month', d.next_run::timestamp) + interval '1 month')::date
                 + LEAST(COALESCE(d.day_of_month, 1),
                         EXTRACT(DAY FROM date_trunc('month', d.next_run::timestamp)
                                          + interval '2 months - 1 day')::int) - 1,
      updated_at = now()
  FROM due d
  WHERE r.id = d.id;
$$;


ALTER FUNCTION "public"."generate_due_recurring"() OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."rls_auto_enable"() RETURNS "event_trigger"
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO 'pg_catalog'
    AS $$
DECLARE
  cmd record;
BEGIN
  FOR cmd IN
    SELECT *
    FROM pg_event_trigger_ddl_commands()
    WHERE command_tag IN ('CREATE TABLE', 'CREATE TABLE AS', 'SELECT INTO')
      AND object_type IN ('table','partitioned table')
  LOOP
     IF cmd.schema_name IS NOT NULL AND cmd.schema_name IN ('public') AND cmd.schema_name NOT IN ('pg_catalog','information_schema') AND cmd.schema_name NOT LIKE 'pg_toast%' AND cmd.schema_name NOT LIKE 'pg_temp%' THEN
      BEGIN
        EXECUTE format('alter table if exists %s enable row level security', cmd.object_identity);
        RAISE LOG 'rls_auto_enable: enabled RLS on %', cmd.object_identity;
      EXCEPTION
        WHEN OTHERS THEN
          RAISE LOG 'rls_auto_enable: failed to enable RLS on %', cmd.object_identity;
      END;
     ELSE
        RAISE LOG 'rls_auto_enable: skip % (either system schema or not in enforced list: %.)', cmd.object_identity, cmd.schema_name;
     END IF;
  END LOOP;
END;
$$;


ALTER FUNCTION "public"."rls_auto_enable"() OWNER TO "postgres";

SET default_tablespace = '';

SET default_table_access_method = "heap";


CREATE TABLE IF NOT EXISTS "public"."budget_items" (
    "item_id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "user_id" "uuid" NOT NULL,
    "type" "public"."budget_type" NOT NULL,
    "category_id" "uuid",
    "amount" numeric(12,2) NOT NULL,
    "date" "date" NOT NULL,
    "notes" "text",
    "created_at" timestamp with time zone DEFAULT "now"(),
    "updated_at" timestamp with time zone DEFAULT "now"(),
    "recurring_id" "uuid"
);


ALTER TABLE "public"."budget_items" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."budget_targets" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "user_id" "uuid" NOT NULL,
    "month" "date" NOT NULL,
    "income" numeric(12,2),
    "expense" numeric(12,2),
    "savings" numeric(12,2),
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "updated_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    CONSTRAINT "budget_targets_expense_check" CHECK (("expense" >= (0)::numeric)),
    CONSTRAINT "budget_targets_income_check" CHECK (("income" >= (0)::numeric)),
    CONSTRAINT "budget_targets_month_check" CHECK ((EXTRACT(day FROM "month") = (1)::numeric)),
    CONSTRAINT "budget_targets_savings_check" CHECK (("savings" >= (0)::numeric))
);


ALTER TABLE "public"."budget_targets" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."categories" (
    "category_id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "user_id" "uuid" NOT NULL,
    "type" "public"."budget_type" NOT NULL,
    "name" character varying(50) NOT NULL,
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL
);


ALTER TABLE "public"."categories" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."notifications" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "user_id" "uuid" NOT NULL,
    "type" character varying NOT NULL,
    "data" "jsonb" DEFAULT '{}'::"jsonb" NOT NULL,
    "read_at" timestamp with time zone,
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    CONSTRAINT "notifications_type_check" CHECK ((("type")::"text" = ANY ((ARRAY['recurring_added'::character varying, 'recurring_paused'::character varying, 'recurring_upcoming'::character varying])::"text"[])))
);


ALTER TABLE "public"."notifications" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."recurring_items" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "user_id" "uuid" NOT NULL,
    "type" "public"."budget_type" NOT NULL,
    "category_id" "uuid" NOT NULL,
    "amount" numeric(12,2) NOT NULL,
    "notes" "text",
    "frequency" character varying DEFAULT 'monthly'::character varying NOT NULL,
    "day_of_month" smallint,
    "next_run" "date" NOT NULL,
    "is_active" boolean DEFAULT true NOT NULL,
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "updated_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    CONSTRAINT "recurring_items_amount_check" CHECK (("amount" > (0)::numeric)),
    CONSTRAINT "recurring_items_day_of_month_check" CHECK ((("day_of_month" >= 1) AND ("day_of_month" <= 31))),
    CONSTRAINT "recurring_items_frequency_check" CHECK ((("frequency")::"text" = 'monthly'::"text")),
    CONSTRAINT "recurring_items_notes_check" CHECK (("char_length"("notes") <= 1500))
);


ALTER TABLE "public"."recurring_items" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."refresh_tokens" (
    "token_id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "user_id" "uuid",
    "token" character varying NOT NULL,
    "expires_at" timestamp without time zone NOT NULL,
    "created_at" timestamp without time zone DEFAULT "now"() NOT NULL
);


ALTER TABLE "public"."refresh_tokens" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."users" (
    "username" character varying,
    "email" character varying NOT NULL,
    "password" character varying NOT NULL,
    "plan_type" character varying DEFAULT 'free'::character varying,
    "is_active" boolean DEFAULT true NOT NULL,
    "created_at" timestamp without time zone DEFAULT "now"() NOT NULL,
    "user_id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "language" "public"."language_code" DEFAULT 'ro'::"public"."language_code" NOT NULL,
    "currency" "public"."currency_code" DEFAULT 'RON'::"public"."currency_code" NOT NULL,
    "has_completed_onboarding" boolean DEFAULT false NOT NULL,
    "completed_tours" "text"[] DEFAULT '{}'::"text"[] NOT NULL
);


ALTER TABLE "public"."users" OWNER TO "postgres";


ALTER TABLE ONLY "public"."budget_items"
    ADD CONSTRAINT "budget_items_pkey" PRIMARY KEY ("item_id");



ALTER TABLE ONLY "public"."budget_targets"
    ADD CONSTRAINT "budget_targets_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."budget_targets"
    ADD CONSTRAINT "budget_targets_user_id_month_key" UNIQUE ("user_id", "month");



ALTER TABLE ONLY "public"."categories"
    ADD CONSTRAINT "categories_pkey" PRIMARY KEY ("category_id");



ALTER TABLE ONLY "public"."categories"
    ADD CONSTRAINT "categories_user_id_type_name_key" UNIQUE ("user_id", "type", "name");



ALTER TABLE ONLY "public"."notifications"
    ADD CONSTRAINT "notifications_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."recurring_items"
    ADD CONSTRAINT "recurring_items_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."refresh_tokens"
    ADD CONSTRAINT "refresh_tokens_pkey" PRIMARY KEY ("token_id");



ALTER TABLE ONLY "public"."users"
    ADD CONSTRAINT "users_email_key" UNIQUE ("email");



ALTER TABLE ONLY "public"."users"
    ADD CONSTRAINT "users_pkey" PRIMARY KEY ("user_id");



CREATE INDEX "budget_items_category_idx" ON "public"."budget_items" USING "btree" ("category_id");



CREATE UNIQUE INDEX "budget_items_recurring_date_key" ON "public"."budget_items" USING "btree" ("recurring_id", "date") WHERE ("recurring_id" IS NOT NULL);



CREATE INDEX "budget_items_user_date_idx" ON "public"."budget_items" USING "btree" ("user_id", "date" DESC);



CREATE INDEX "notifications_unread_idx" ON "public"."notifications" USING "btree" ("user_id") WHERE ("read_at" IS NULL);



CREATE INDEX "notifications_user_created_idx" ON "public"."notifications" USING "btree" ("user_id", "created_at" DESC);



CREATE UNIQUE INDEX "recurring_items_category_key" ON "public"."recurring_items" USING "btree" ("category_id");



CREATE INDEX "recurring_items_due_idx" ON "public"."recurring_items" USING "btree" ("next_run") WHERE "is_active";



CREATE INDEX "recurring_items_user_idx" ON "public"."recurring_items" USING "btree" ("user_id");



CREATE INDEX "refresh_tokens_token_idx" ON "public"."refresh_tokens" USING "btree" ("token");



CREATE INDEX "refresh_tokens_user_idx" ON "public"."refresh_tokens" USING "btree" ("user_id");



ALTER TABLE ONLY "public"."budget_items"
    ADD CONSTRAINT "budget_items_category_id_fkey" FOREIGN KEY ("category_id") REFERENCES "public"."categories"("category_id") ON DELETE SET NULL;



ALTER TABLE ONLY "public"."budget_items"
    ADD CONSTRAINT "budget_items_recurring_id_fkey" FOREIGN KEY ("recurring_id") REFERENCES "public"."recurring_items"("id") ON DELETE SET NULL;



ALTER TABLE ONLY "public"."budget_items"
    ADD CONSTRAINT "budget_items_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "public"."users"("user_id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."budget_targets"
    ADD CONSTRAINT "budget_targets_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "public"."users"("user_id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."categories"
    ADD CONSTRAINT "categories_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "public"."users"("user_id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."notifications"
    ADD CONSTRAINT "notifications_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "public"."users"("user_id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."recurring_items"
    ADD CONSTRAINT "recurring_items_category_id_fkey" FOREIGN KEY ("category_id") REFERENCES "public"."categories"("category_id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."recurring_items"
    ADD CONSTRAINT "recurring_items_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "public"."users"("user_id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."refresh_tokens"
    ADD CONSTRAINT "refresh_tokens_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "public"."users"("user_id");



ALTER TABLE "public"."budget_items" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."budget_targets" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."categories" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."notifications" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."recurring_items" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."refresh_tokens" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."users" ENABLE ROW LEVEL SECURITY;


GRANT USAGE ON SCHEMA "public" TO "postgres";
GRANT USAGE ON SCHEMA "public" TO "anon";
GRANT USAGE ON SCHEMA "public" TO "authenticated";
GRANT USAGE ON SCHEMA "public" TO "service_role";



REVOKE ALL ON FUNCTION "public"."generate_due_recurring"() FROM PUBLIC;
GRANT ALL ON FUNCTION "public"."generate_due_recurring"() TO "service_role";



GRANT ALL ON FUNCTION "public"."rls_auto_enable"() TO "anon";
GRANT ALL ON FUNCTION "public"."rls_auto_enable"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."rls_auto_enable"() TO "service_role";



GRANT ALL ON TABLE "public"."budget_items" TO "anon";
GRANT ALL ON TABLE "public"."budget_items" TO "authenticated";
GRANT ALL ON TABLE "public"."budget_items" TO "service_role";



GRANT ALL ON TABLE "public"."budget_targets" TO "anon";
GRANT ALL ON TABLE "public"."budget_targets" TO "authenticated";
GRANT ALL ON TABLE "public"."budget_targets" TO "service_role";



GRANT ALL ON TABLE "public"."categories" TO "anon";
GRANT ALL ON TABLE "public"."categories" TO "authenticated";
GRANT ALL ON TABLE "public"."categories" TO "service_role";



GRANT ALL ON TABLE "public"."notifications" TO "anon";
GRANT ALL ON TABLE "public"."notifications" TO "authenticated";
GRANT ALL ON TABLE "public"."notifications" TO "service_role";



GRANT ALL ON TABLE "public"."recurring_items" TO "anon";
GRANT ALL ON TABLE "public"."recurring_items" TO "authenticated";
GRANT ALL ON TABLE "public"."recurring_items" TO "service_role";



GRANT ALL ON TABLE "public"."refresh_tokens" TO "anon";
GRANT ALL ON TABLE "public"."refresh_tokens" TO "authenticated";
GRANT ALL ON TABLE "public"."refresh_tokens" TO "service_role";



GRANT ALL ON TABLE "public"."users" TO "anon";
GRANT ALL ON TABLE "public"."users" TO "authenticated";
GRANT ALL ON TABLE "public"."users" TO "service_role";



ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON SEQUENCES TO "postgres";
ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON SEQUENCES TO "anon";
ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON SEQUENCES TO "authenticated";
ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON SEQUENCES TO "service_role";






ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON FUNCTIONS TO "postgres";
ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON FUNCTIONS TO "anon";
ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON FUNCTIONS TO "authenticated";
ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON FUNCTIONS TO "service_role";






ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON TABLES TO "postgres";
ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON TABLES TO "anon";
ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON TABLES TO "authenticated";
ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON TABLES TO "service_role";







