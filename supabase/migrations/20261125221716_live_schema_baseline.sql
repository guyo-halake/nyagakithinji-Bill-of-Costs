


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



CREATE OR REPLACE FUNCTION "public"."current_firm_id"() RETURNS "uuid"
    LANGUAGE "sql" STABLE SECURITY DEFINER
    SET "search_path" TO 'public'
    SET "row_security" TO 'off'
    AS $$
    SELECT firm_id
    FROM public.users
    WHERE auth_user_id = auth.uid() AND is_active = true
    LIMIT 1;
$$;


ALTER FUNCTION "public"."current_firm_id"() OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."current_profile_id"() RETURNS "uuid"
    LANGUAGE "sql" STABLE SECURITY DEFINER
    SET "search_path" TO 'public'
    SET "row_security" TO 'off'
    AS $$
    SELECT id
    FROM public.users
    WHERE auth_user_id = auth.uid() AND is_active = true
    LIMIT 1;
$$;


ALTER FUNCTION "public"."current_profile_id"() OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."has_permission"("permission_key" "text", "target_firm_id" "uuid", "required_scope" "text" DEFAULT 'Own'::"text") RETURNS boolean
    LANGUAGE "sql" STABLE SECURITY DEFINER
    SET "search_path" TO 'public'
    SET "row_security" TO 'off'
    AS $$
    SELECT EXISTS (
        SELECT 1
        FROM public.users AS profile
        WHERE profile.auth_user_id = auth.uid()
          AND profile.is_active = true
          AND (
              profile.role IN ('admin', 'developer')
              OR (
                  profile.firm_id = target_firm_id
                  AND (
                      EXISTS (
                          SELECT 1
                          FROM public.user_permission_overrides AS permission_override
                          WHERE permission_override.user_id = profile.id
                            AND permission_override.permission_code = permission_key
                            AND permission_override.effect = 'grant'
                            AND (permission_override.expires_at IS NULL
                                 OR permission_override.expires_at > NOW())
                      )
                      OR EXISTS (
                          SELECT 1
                          FROM public.user_role_assignments AS assignment
                          JOIN public.role_template_permissions AS template_permission
                            ON template_permission.role_template_id = assignment.role_template_id
                          WHERE assignment.user_id = profile.id
                            AND template_permission.permission_code = permission_key
                            AND (
                                template_permission.scope = required_scope
                                OR template_permission.scope IN ('Firm', 'Platform')
                            )
                      )
                  )
              )
          )
          AND NOT EXISTS (
              SELECT 1
              FROM public.user_permission_overrides AS denied
              WHERE denied.user_id = profile.id
                AND denied.permission_code = permission_key
                AND denied.effect = 'deny'
                AND (denied.expires_at IS NULL OR denied.expires_at > NOW())
          )
    );
$$;


ALTER FUNCTION "public"."has_permission"("permission_key" "text", "target_firm_id" "uuid", "required_scope" "text") OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."is_firm_member"("target_firm_id" "uuid") RETURNS boolean
    LANGUAGE "sql" STABLE SECURITY DEFINER
    SET "search_path" TO 'public'
    SET "row_security" TO 'off'
    AS $$
    SELECT EXISTS (
        SELECT 1
        FROM public.users
        WHERE auth_user_id = auth.uid()
          AND is_active = true
          AND firm_id = target_firm_id
    );
$$;


ALTER FUNCTION "public"."is_firm_member"("target_firm_id" "uuid") OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."link_auth_user_to_profile"() RETURNS "trigger"
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO 'public'
    AS $$
BEGIN
    UPDATE public.users
    SET auth_user_id = NEW.id,
        updated_at = NOW()
    WHERE lower(email) = lower(NEW.email)
      AND auth_user_id IS DISTINCT FROM NEW.id;
    RETURN NEW;
END;
$$;


ALTER FUNCTION "public"."link_auth_user_to_profile"() OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."set_admin_audit_actor"() RETURNS "trigger"
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO 'public'
    AS $$
BEGIN
    NEW.user_id := auth.uid();
    RETURN NEW;
END;
$$;


ALTER FUNCTION "public"."set_admin_audit_actor"() OWNER TO "postgres";

SET default_tablespace = '';

SET default_table_access_method = "heap";


CREATE TABLE IF NOT EXISTS "public"."activity_logs" (
    "id" "uuid" DEFAULT "extensions"."uuid_generate_v4"() NOT NULL,
    "firm_id" "uuid",
    "user_id" "uuid",
    "user_name" character varying(255) NOT NULL,
    "action" character varying(100) NOT NULL,
    "details" "text" NOT NULL,
    "metadata" "jsonb" DEFAULT '{}'::"jsonb",
    "created_at" timestamp with time zone DEFAULT CURRENT_TIMESTAMP
);


ALTER TABLE "public"."activity_logs" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."admin_audit_logs" (
    "id" "uuid" DEFAULT "extensions"."uuid_generate_v4"() NOT NULL,
    "user_id" "uuid",
    "action" "text" NOT NULL,
    "details" "jsonb",
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL
);


ALTER TABLE "public"."admin_audit_logs" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."clients" (
    "id" "uuid" DEFAULT "extensions"."uuid_generate_v4"() NOT NULL,
    "firm_id" "uuid",
    "name" character varying(255) NOT NULL,
    "client_type" character varying(50) DEFAULT 'corporate'::character varying,
    "email" character varying(255),
    "phone" character varying(100),
    "kra_pin" character varying(100),
    "address" "text",
    "contact_person" character varying(255),
    "created_at" timestamp with time zone DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "clients_client_type_check" CHECK ((("client_type")::"text" = ANY ((ARRAY['corporate'::character varying, 'individual'::character varying, 'trust'::character varying, 'government'::character varying])::"text"[])))
);


ALTER TABLE "public"."clients" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."documents" (
    "id" "uuid" DEFAULT "extensions"."uuid_generate_v4"() NOT NULL,
    "firm_id" "uuid",
    "matter_id" "uuid",
    "folder_id" "uuid",
    "name" character varying(255) NOT NULL,
    "storage_path" "text" NOT NULL,
    "file_size" bigint DEFAULT 0,
    "mime_type" character varying(100) DEFAULT 'application/pdf'::character varying,
    "version" integer DEFAULT 1,
    "tags" "text"[] DEFAULT '{}'::"text"[],
    "is_confidential" boolean DEFAULT false,
    "created_by" "uuid",
    "created_at" timestamp with time zone DEFAULT CURRENT_TIMESTAMP
);


ALTER TABLE "public"."documents" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."fee_note_items" (
    "id" "uuid" DEFAULT "extensions"."uuid_generate_v4"() NOT NULL,
    "fee_note_id" "uuid",
    "item_number" integer NOT NULL,
    "item_date" "date" DEFAULT CURRENT_DATE,
    "description" "text" NOT NULL,
    "item_type" character varying(50) DEFAULT 'drawing_folio'::character varying,
    "quantity" numeric(10,2) DEFAULT 1.00,
    "unit_rate" numeric(15,2) DEFAULT 0.00,
    "claimed_amount" numeric(15,2) DEFAULT 0.00,
    "taxed_off_amount" numeric(15,2) DEFAULT 0.00,
    "allowed_amount" numeric(15,2) DEFAULT 0.00,
    CONSTRAINT "fee_note_items_item_type_check" CHECK ((("item_type")::"text" = ANY ((ARRAY['instruction_fee'::character varying, 'getting_up_fee'::character varying, 'drawing_folio'::character varying, 'copying_folio'::character varying, 'attendance_court'::character varying, 'attendance_office'::character varying, 'letter'::character varying, 'disbursement'::character varying])::"text"[])))
);


ALTER TABLE "public"."fee_note_items" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."fee_notes" (
    "id" "uuid" DEFAULT "extensions"."uuid_generate_v4"() NOT NULL,
    "firm_id" "uuid",
    "matter_id" "uuid",
    "client_id" "uuid",
    "bill_number" character varying(50) NOT NULL,
    "bill_type" character varying(50) DEFAULT 'bill_of_costs'::character varying,
    "court_schedule" character varying(50) DEFAULT 'schedule_6_high_court'::character varying,
    "claim_value" numeric(15,2) DEFAULT 0.00,
    "instruction_fee" numeric(15,2) DEFAULT 0.00,
    "getting_up_fee" numeric(15,2) DEFAULT 0.00,
    "disbursements_total" numeric(15,2) DEFAULT 0.00,
    "vat_amount" numeric(15,2) DEFAULT 0.00,
    "taxed_off_total" numeric(15,2) DEFAULT 0.00,
    "grand_total" numeric(15,2) DEFAULT 0.00,
    "status" character varying(50) DEFAULT 'draft'::character varying,
    "created_at" timestamp with time zone DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "fee_notes_bill_type_check" CHECK ((("bill_type")::"text" = ANY ((ARRAY['bill_of_costs'::character varying, 'fee_note'::character varying, 'proforma_invoice'::character varying])::"text"[]))),
    CONSTRAINT "fee_notes_court_schedule_check" CHECK ((("court_schedule")::"text" = ANY ((ARRAY['schedule_1_conveyancing'::character varying, 'schedule_5_magistrate'::character varying, 'schedule_6_high_court'::character varying])::"text"[]))),
    CONSTRAINT "fee_notes_status_check" CHECK ((("status")::"text" = ANY ((ARRAY['draft'::character varying, 'pending_approval'::character varying, 'issued'::character varying, 'in_taxation'::character varying, 'taxed'::character varying, 'paid'::character varying, 'overdue'::character varying])::"text"[])))
);


ALTER TABLE "public"."fee_notes" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."firms" (
    "id" "uuid" DEFAULT "extensions"."uuid_generate_v4"() NOT NULL,
    "name" character varying(255) NOT NULL,
    "firm_reg_no" character varying(100) NOT NULL,
    "email" character varying(255) NOT NULL,
    "phone" character varying(100),
    "address" "text",
    "po_box" character varying(255),
    "kra_pin" character varying(100),
    "bank_details" "text",
    "logo_url" "text",
    "created_at" timestamp with time zone DEFAULT CURRENT_TIMESTAMP
);


ALTER TABLE "public"."firms" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."folders" (
    "id" "uuid" DEFAULT "extensions"."uuid_generate_v4"() NOT NULL,
    "firm_id" "uuid",
    "matter_id" "uuid",
    "parent_id" "uuid",
    "name" character varying(255) NOT NULL,
    "path" "text" NOT NULL,
    "created_by" "uuid",
    "created_at" timestamp with time zone DEFAULT CURRENT_TIMESTAMP
);


ALTER TABLE "public"."folders" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."global_settings" (
    "id" "uuid" DEFAULT "extensions"."uuid_generate_v4"() NOT NULL,
    "firm_name" "text" DEFAULT 'Karani Law'::"text" NOT NULL,
    "domain" "text" DEFAULT 'karanilaw.com'::"text" NOT NULL,
    "theme_color" "text" DEFAULT '#000000'::"text" NOT NULL,
    "logo_url" "text",
    "vat_rate" numeric DEFAULT 16.0 NOT NULL,
    "rounding_rules" boolean DEFAULT true NOT NULL,
    "watermark_text" "text" DEFAULT 'DRAFT'::"text" NOT NULL,
    "pdf_margin" numeric DEFAULT 15.0 NOT NULL,
    "max_file_size_mb" integer DEFAULT 50 NOT NULL,
    "allowed_file_types" "text"[] DEFAULT ARRAY['.pdf'::"text", '.docx'::"text", '.xlsx'::"text"] NOT NULL,
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "updated_at" timestamp with time zone DEFAULT "now"() NOT NULL
);


ALTER TABLE "public"."global_settings" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."matters" (
    "id" "uuid" DEFAULT "extensions"."uuid_generate_v4"() NOT NULL,
    "firm_id" "uuid",
    "client_id" "uuid",
    "title" character varying(500) NOT NULL,
    "cause_number" character varying(100),
    "forum" character varying(100) DEFAULT 'High Court Commercial'::character varying,
    "applicant" character varying(255),
    "applicant_role" character varying(100) DEFAULT 'Claimant'::character varying,
    "respondent" character varying(255),
    "respondent_role" character varying(100) DEFAULT 'Respondent'::character varying,
    "status" character varying(50) DEFAULT 'open'::character varying,
    "claim_value" numeric(15,2) DEFAULT 0.00,
    "assigned_advocate_id" "uuid",
    "created_at" timestamp with time zone DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "matters_status_check" CHECK ((("status")::"text" = ANY ((ARRAY['open'::character varying, 'in_taxation'::character varying, 'taxation_ready'::character varying, 'judgment_rendered'::character varying, 'closed'::character varying])::"text"[])))
);


ALTER TABLE "public"."matters" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."messages" (
    "id" "uuid" DEFAULT "extensions"."uuid_generate_v4"() NOT NULL,
    "firm_id" "uuid",
    "sender_id" "text" NOT NULL,
    "sender_name" "text" NOT NULL,
    "recipient_id" "text" NOT NULL,
    "recipient_name" "text" NOT NULL,
    "channel" "text" DEFAULT 'email'::"text" NOT NULL,
    "message_type" "text" DEFAULT 'client'::"text" NOT NULL,
    "message_text" "text" NOT NULL,
    "attachment_name" "text",
    "attachment_url" "text",
    "is_read" boolean DEFAULT false NOT NULL,
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL
);


ALTER TABLE "public"."messages" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."notifications" (
    "id" "uuid" DEFAULT "extensions"."uuid_generate_v4"() NOT NULL,
    "firm_id" "uuid",
    "user_id" "uuid",
    "title" "text" NOT NULL,
    "message" "text" NOT NULL,
    "category" "text" DEFAULT 'system'::"text" NOT NULL,
    "is_read" boolean DEFAULT false NOT NULL,
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL
);


ALTER TABLE "public"."notifications" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."permission_audit_logs" (
    "id" "uuid" DEFAULT "extensions"."uuid_generate_v4"() NOT NULL,
    "firm_id" "uuid",
    "target_user_id" "uuid",
    "actor_user_id" "uuid",
    "permission_code" "text",
    "action" "text" NOT NULL,
    "details" "jsonb" DEFAULT '{}'::"jsonb" NOT NULL,
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL
);


ALTER TABLE "public"."permission_audit_logs" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."permission_catalog" (
    "code" "text" NOT NULL,
    "resource" "text" NOT NULL,
    "action" "text" NOT NULL,
    "name" "text" NOT NULL,
    "description" "text" DEFAULT ''::"text" NOT NULL,
    "allowed_scopes" "text"[] DEFAULT ARRAY['Own'::"text", 'Assigned'::"text", 'Firm'::"text", 'Platform'::"text"] NOT NULL,
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL
);


ALTER TABLE "public"."permission_catalog" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."role_template_permissions" (
    "role_template_id" "uuid" NOT NULL,
    "permission_code" "text" NOT NULL,
    "scope" "text" DEFAULT 'Firm'::"text" NOT NULL,
    CONSTRAINT "role_template_permissions_scope_check" CHECK (("scope" = ANY (ARRAY['Own'::"text", 'Assigned'::"text", 'Firm'::"text", 'Platform'::"text"])))
);


ALTER TABLE "public"."role_template_permissions" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."role_templates" (
    "id" "uuid" DEFAULT "extensions"."uuid_generate_v4"() NOT NULL,
    "firm_id" "uuid",
    "code" "text" NOT NULL,
    "name" "text" NOT NULL,
    "description" "text" DEFAULT ''::"text" NOT NULL,
    "is_system" boolean DEFAULT false NOT NULL,
    "created_by" "uuid",
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "updated_at" timestamp with time zone DEFAULT "now"() NOT NULL
);


ALTER TABLE "public"."role_templates" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."user_permission_overrides" (
    "id" "uuid" DEFAULT "extensions"."uuid_generate_v4"() NOT NULL,
    "user_id" "uuid" NOT NULL,
    "permission_code" "text" NOT NULL,
    "effect" "text" NOT NULL,
    "scope" "text" DEFAULT 'Firm'::"text" NOT NULL,
    "reason" "text" DEFAULT ''::"text" NOT NULL,
    "expires_at" timestamp with time zone,
    "changed_by" "uuid",
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    CONSTRAINT "user_permission_overrides_effect_check" CHECK (("effect" = ANY (ARRAY['grant'::"text", 'deny'::"text"]))),
    CONSTRAINT "user_permission_overrides_scope_check" CHECK (("scope" = ANY (ARRAY['Own'::"text", 'Assigned'::"text", 'Firm'::"text", 'Platform'::"text"])))
);


ALTER TABLE "public"."user_permission_overrides" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."user_role_assignments" (
    "user_id" "uuid" NOT NULL,
    "role_template_id" "uuid" NOT NULL,
    "assigned_by" "uuid",
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL
);


ALTER TABLE "public"."user_role_assignments" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."users" (
    "id" "uuid" DEFAULT "extensions"."uuid_generate_v4"() NOT NULL,
    "firm_id" "uuid",
    "full_name" character varying(255) NOT NULL,
    "email" character varying(255) NOT NULL,
    "lsk_no" character varying(100),
    "role" character varying(50) DEFAULT 'advocate'::character varying,
    "permissions" "jsonb" DEFAULT '{"can_manage_matters": true, "can_access_taxation": true, "can_approve_fee_notes": false}'::"jsonb",
    "avatar_url" "text",
    "is_active" boolean DEFAULT true,
    "created_at" timestamp with time zone DEFAULT CURRENT_TIMESTAMP,
    "auth_user_id" "uuid",
    "position" "text",
    "phone_primary" "text",
    "phone_secondary" "text",
    "updated_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    CONSTRAINT "users_role_check" CHECK ((("role")::"text" = ANY ((ARRAY['senior_partner'::character varying, 'partner'::character varying, 'advocate'::character varying, 'legal_assistant'::character varying, 'finance_manager'::character varying, 'admin'::character varying])::"text"[])))
);


ALTER TABLE "public"."users" OWNER TO "postgres";


ALTER TABLE ONLY "public"."activity_logs"
    ADD CONSTRAINT "activity_logs_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."admin_audit_logs"
    ADD CONSTRAINT "admin_audit_logs_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."clients"
    ADD CONSTRAINT "clients_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."documents"
    ADD CONSTRAINT "documents_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."fee_note_items"
    ADD CONSTRAINT "fee_note_items_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."fee_notes"
    ADD CONSTRAINT "fee_notes_bill_number_key" UNIQUE ("bill_number");



ALTER TABLE ONLY "public"."fee_notes"
    ADD CONSTRAINT "fee_notes_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."firms"
    ADD CONSTRAINT "firms_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."folders"
    ADD CONSTRAINT "folders_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."global_settings"
    ADD CONSTRAINT "global_settings_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."matters"
    ADD CONSTRAINT "matters_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."messages"
    ADD CONSTRAINT "messages_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."notifications"
    ADD CONSTRAINT "notifications_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."permission_audit_logs"
    ADD CONSTRAINT "permission_audit_logs_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."permission_catalog"
    ADD CONSTRAINT "permission_catalog_pkey" PRIMARY KEY ("code");



ALTER TABLE ONLY "public"."role_template_permissions"
    ADD CONSTRAINT "role_template_permissions_pkey" PRIMARY KEY ("role_template_id", "permission_code");



ALTER TABLE ONLY "public"."role_templates"
    ADD CONSTRAINT "role_templates_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."user_permission_overrides"
    ADD CONSTRAINT "user_permission_overrides_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."user_permission_overrides"
    ADD CONSTRAINT "user_permission_overrides_user_id_permission_code_key" UNIQUE ("user_id", "permission_code");



ALTER TABLE ONLY "public"."user_role_assignments"
    ADD CONSTRAINT "user_role_assignments_pkey" PRIMARY KEY ("user_id", "role_template_id");



ALTER TABLE ONLY "public"."users"
    ADD CONSTRAINT "users_email_key" UNIQUE ("email");



ALTER TABLE ONLY "public"."users"
    ADD CONSTRAINT "users_pkey" PRIMARY KEY ("id");



CREATE INDEX "idx_activity_firm" ON "public"."activity_logs" USING "btree" ("firm_id");



CREATE INDEX "idx_documents_folder" ON "public"."documents" USING "btree" ("folder_id");



CREATE INDEX "idx_fee_notes_matter" ON "public"."fee_notes" USING "btree" ("matter_id");



CREATE INDEX "idx_folders_matter" ON "public"."folders" USING "btree" ("matter_id");



CREATE INDEX "idx_matters_firm" ON "public"."matters" USING "btree" ("firm_id");



CREATE UNIQUE INDEX "role_templates_firm_code_uidx" ON "public"."role_templates" USING "btree" ("firm_id", "code") WHERE ("firm_id" IS NOT NULL);



CREATE UNIQUE INDEX "role_templates_global_code_uidx" ON "public"."role_templates" USING "btree" ("code") WHERE ("firm_id" IS NULL);



CREATE UNIQUE INDEX "users_auth_user_id_uidx" ON "public"."users" USING "btree" ("auth_user_id") WHERE ("auth_user_id" IS NOT NULL);



CREATE OR REPLACE TRIGGER "set_admin_audit_actor_trigger" BEFORE INSERT ON "public"."admin_audit_logs" FOR EACH ROW EXECUTE FUNCTION "public"."set_admin_audit_actor"();



ALTER TABLE ONLY "public"."activity_logs"
    ADD CONSTRAINT "activity_logs_firm_id_fkey" FOREIGN KEY ("firm_id") REFERENCES "public"."firms"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."activity_logs"
    ADD CONSTRAINT "activity_logs_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE SET NULL;



ALTER TABLE ONLY "public"."admin_audit_logs"
    ADD CONSTRAINT "admin_audit_logs_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "auth"."users"("id") ON DELETE SET NULL;



ALTER TABLE ONLY "public"."clients"
    ADD CONSTRAINT "clients_firm_id_fkey" FOREIGN KEY ("firm_id") REFERENCES "public"."firms"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."documents"
    ADD CONSTRAINT "documents_created_by_fkey" FOREIGN KEY ("created_by") REFERENCES "public"."users"("id") ON DELETE SET NULL;



ALTER TABLE ONLY "public"."documents"
    ADD CONSTRAINT "documents_firm_id_fkey" FOREIGN KEY ("firm_id") REFERENCES "public"."firms"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."documents"
    ADD CONSTRAINT "documents_folder_id_fkey" FOREIGN KEY ("folder_id") REFERENCES "public"."folders"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."documents"
    ADD CONSTRAINT "documents_matter_id_fkey" FOREIGN KEY ("matter_id") REFERENCES "public"."matters"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."fee_note_items"
    ADD CONSTRAINT "fee_note_items_fee_note_id_fkey" FOREIGN KEY ("fee_note_id") REFERENCES "public"."fee_notes"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."fee_notes"
    ADD CONSTRAINT "fee_notes_client_id_fkey" FOREIGN KEY ("client_id") REFERENCES "public"."clients"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."fee_notes"
    ADD CONSTRAINT "fee_notes_firm_id_fkey" FOREIGN KEY ("firm_id") REFERENCES "public"."firms"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."fee_notes"
    ADD CONSTRAINT "fee_notes_matter_id_fkey" FOREIGN KEY ("matter_id") REFERENCES "public"."matters"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."folders"
    ADD CONSTRAINT "folders_created_by_fkey" FOREIGN KEY ("created_by") REFERENCES "public"."users"("id") ON DELETE SET NULL;



ALTER TABLE ONLY "public"."folders"
    ADD CONSTRAINT "folders_firm_id_fkey" FOREIGN KEY ("firm_id") REFERENCES "public"."firms"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."folders"
    ADD CONSTRAINT "folders_matter_id_fkey" FOREIGN KEY ("matter_id") REFERENCES "public"."matters"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."folders"
    ADD CONSTRAINT "folders_parent_id_fkey" FOREIGN KEY ("parent_id") REFERENCES "public"."folders"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."matters"
    ADD CONSTRAINT "matters_assigned_advocate_id_fkey" FOREIGN KEY ("assigned_advocate_id") REFERENCES "public"."users"("id") ON DELETE SET NULL;



ALTER TABLE ONLY "public"."matters"
    ADD CONSTRAINT "matters_client_id_fkey" FOREIGN KEY ("client_id") REFERENCES "public"."clients"("id") ON DELETE RESTRICT;



ALTER TABLE ONLY "public"."matters"
    ADD CONSTRAINT "matters_firm_id_fkey" FOREIGN KEY ("firm_id") REFERENCES "public"."firms"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."messages"
    ADD CONSTRAINT "messages_firm_id_fkey" FOREIGN KEY ("firm_id") REFERENCES "public"."firms"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."notifications"
    ADD CONSTRAINT "notifications_firm_id_fkey" FOREIGN KEY ("firm_id") REFERENCES "public"."firms"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."notifications"
    ADD CONSTRAINT "notifications_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."permission_audit_logs"
    ADD CONSTRAINT "permission_audit_logs_actor_user_id_fkey" FOREIGN KEY ("actor_user_id") REFERENCES "public"."users"("id") ON DELETE SET NULL;



ALTER TABLE ONLY "public"."permission_audit_logs"
    ADD CONSTRAINT "permission_audit_logs_firm_id_fkey" FOREIGN KEY ("firm_id") REFERENCES "public"."firms"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."permission_audit_logs"
    ADD CONSTRAINT "permission_audit_logs_target_user_id_fkey" FOREIGN KEY ("target_user_id") REFERENCES "public"."users"("id") ON DELETE SET NULL;



ALTER TABLE ONLY "public"."role_template_permissions"
    ADD CONSTRAINT "role_template_permissions_permission_code_fkey" FOREIGN KEY ("permission_code") REFERENCES "public"."permission_catalog"("code") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."role_template_permissions"
    ADD CONSTRAINT "role_template_permissions_role_template_id_fkey" FOREIGN KEY ("role_template_id") REFERENCES "public"."role_templates"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."role_templates"
    ADD CONSTRAINT "role_templates_created_by_fkey" FOREIGN KEY ("created_by") REFERENCES "public"."users"("id") ON DELETE SET NULL;



ALTER TABLE ONLY "public"."role_templates"
    ADD CONSTRAINT "role_templates_firm_id_fkey" FOREIGN KEY ("firm_id") REFERENCES "public"."firms"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."user_permission_overrides"
    ADD CONSTRAINT "user_permission_overrides_changed_by_fkey" FOREIGN KEY ("changed_by") REFERENCES "public"."users"("id") ON DELETE SET NULL;



ALTER TABLE ONLY "public"."user_permission_overrides"
    ADD CONSTRAINT "user_permission_overrides_permission_code_fkey" FOREIGN KEY ("permission_code") REFERENCES "public"."permission_catalog"("code") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."user_permission_overrides"
    ADD CONSTRAINT "user_permission_overrides_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."user_role_assignments"
    ADD CONSTRAINT "user_role_assignments_assigned_by_fkey" FOREIGN KEY ("assigned_by") REFERENCES "public"."users"("id") ON DELETE SET NULL;



ALTER TABLE ONLY "public"."user_role_assignments"
    ADD CONSTRAINT "user_role_assignments_role_template_id_fkey" FOREIGN KEY ("role_template_id") REFERENCES "public"."role_templates"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."user_role_assignments"
    ADD CONSTRAINT "user_role_assignments_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."users"
    ADD CONSTRAINT "users_auth_user_id_fkey" FOREIGN KEY ("auth_user_id") REFERENCES "auth"."users"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."users"
    ADD CONSTRAINT "users_firm_id_fkey" FOREIGN KEY ("firm_id") REFERENCES "public"."firms"("id") ON DELETE CASCADE;



ALTER TABLE "public"."activity_logs" ENABLE ROW LEVEL SECURITY;


CREATE POLICY "admin_audit_insert" ON "public"."admin_audit_logs" FOR INSERT TO "authenticated" WITH CHECK (("user_id" = "auth"."uid"()));



ALTER TABLE "public"."admin_audit_logs" ENABLE ROW LEVEL SECURITY;


CREATE POLICY "admin_audit_read" ON "public"."admin_audit_logs" FOR SELECT TO "authenticated" USING ("public"."has_permission"('audit.view'::"text", "public"."current_firm_id"()));



ALTER TABLE "public"."clients" ENABLE ROW LEVEL SECURITY;


CREATE POLICY "clients_select" ON "public"."clients" FOR SELECT TO "authenticated" USING ("public"."is_firm_member"("firm_id"));



ALTER TABLE "public"."documents" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."fee_note_items" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."fee_notes" ENABLE ROW LEVEL SECURITY;


CREATE POLICY "fee_notes_select" ON "public"."fee_notes" FOR SELECT TO "authenticated" USING ("public"."is_firm_member"("firm_id"));



ALTER TABLE "public"."firms" ENABLE ROW LEVEL SECURITY;


CREATE POLICY "firms_select_member" ON "public"."firms" FOR SELECT TO "authenticated" USING ("public"."is_firm_member"("id"));



ALTER TABLE "public"."folders" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."global_settings" ENABLE ROW LEVEL SECURITY;


CREATE POLICY "global_settings_read" ON "public"."global_settings" FOR SELECT TO "authenticated" USING (true);



CREATE POLICY "global_settings_update" ON "public"."global_settings" FOR UPDATE TO "authenticated" USING ("public"."has_permission"('profile.update_firm'::"text", "public"."current_firm_id"())) WITH CHECK ("public"."has_permission"('profile.update_firm'::"text", "public"."current_firm_id"()));



ALTER TABLE "public"."matters" ENABLE ROW LEVEL SECURITY;


CREATE POLICY "matters_select" ON "public"."matters" FOR SELECT TO "authenticated" USING ("public"."is_firm_member"("firm_id"));



ALTER TABLE "public"."messages" ENABLE ROW LEVEL SECURITY;


CREATE POLICY "messages_insert_firm" ON "public"."messages" FOR INSERT TO "authenticated" WITH CHECK ("public"."is_firm_member"("firm_id"));



CREATE POLICY "messages_select_firm" ON "public"."messages" FOR SELECT TO "authenticated" USING ("public"."is_firm_member"("firm_id"));



ALTER TABLE "public"."notifications" ENABLE ROW LEVEL SECURITY;


CREATE POLICY "notifications_insert_firm" ON "public"."notifications" FOR INSERT TO "authenticated" WITH CHECK ("public"."is_firm_member"("firm_id"));



CREATE POLICY "notifications_select_own" ON "public"."notifications" FOR SELECT TO "authenticated" USING (("user_id" = "public"."current_profile_id"()));



ALTER TABLE "public"."permission_audit_logs" ENABLE ROW LEVEL SECURITY;


CREATE POLICY "permission_audit_same_firm" ON "public"."permission_audit_logs" FOR SELECT TO "authenticated" USING (("public"."is_firm_member"("firm_id") AND "public"."has_permission"('audit.view'::"text", "firm_id")));



ALTER TABLE "public"."permission_catalog" ENABLE ROW LEVEL SECURITY;


CREATE POLICY "permission_catalog_admin_write" ON "public"."permission_catalog" TO "authenticated" USING ("public"."has_permission"('profile.assign_roles'::"text", "public"."current_firm_id"())) WITH CHECK ("public"."has_permission"('profile.assign_roles'::"text", "public"."current_firm_id"()));



CREATE POLICY "permission_catalog_read" ON "public"."permission_catalog" FOR SELECT TO "authenticated" USING (true);



ALTER TABLE "public"."role_template_permissions" ENABLE ROW LEVEL SECURITY;


CREATE POLICY "role_template_permissions_admin_write" ON "public"."role_template_permissions" TO "authenticated" USING ("public"."has_permission"('profile.assign_roles'::"text", "public"."current_firm_id"())) WITH CHECK ("public"."has_permission"('profile.assign_roles'::"text", "public"."current_firm_id"()));



CREATE POLICY "role_template_permissions_read" ON "public"."role_template_permissions" FOR SELECT TO "authenticated" USING ((EXISTS ( SELECT 1
   FROM "public"."role_templates" "template"
  WHERE (("template"."id" = "role_template_permissions"."role_template_id") AND (("template"."firm_id" IS NULL) OR "public"."is_firm_member"("template"."firm_id"))))));



ALTER TABLE "public"."role_templates" ENABLE ROW LEVEL SECURITY;


CREATE POLICY "role_templates_admin_write" ON "public"."role_templates" TO "authenticated" USING ("public"."has_permission"('profile.assign_roles'::"text", COALESCE("firm_id", "public"."current_firm_id"()))) WITH CHECK ("public"."has_permission"('profile.assign_roles'::"text", COALESCE("firm_id", "public"."current_firm_id"())));



CREATE POLICY "role_templates_read" ON "public"."role_templates" FOR SELECT TO "authenticated" USING ((("firm_id" IS NULL) OR "public"."is_firm_member"("firm_id")));



CREATE POLICY "user_overrides_same_firm" ON "public"."user_permission_overrides" FOR SELECT TO "authenticated" USING ((("user_id" = "public"."current_profile_id"()) OR "public"."has_permission"('profile.assign_roles'::"text", "public"."current_firm_id"())));



ALTER TABLE "public"."user_permission_overrides" ENABLE ROW LEVEL SECURITY;


CREATE POLICY "user_permission_overrides_admin_write" ON "public"."user_permission_overrides" TO "authenticated" USING ("public"."has_permission"('profile.assign_roles'::"text", "public"."current_firm_id"())) WITH CHECK ("public"."has_permission"('profile.assign_roles'::"text", "public"."current_firm_id"()));



ALTER TABLE "public"."user_role_assignments" ENABLE ROW LEVEL SECURITY;


CREATE POLICY "user_role_assignments_admin_write" ON "public"."user_role_assignments" TO "authenticated" USING ("public"."has_permission"('profile.assign_roles'::"text", "public"."current_firm_id"())) WITH CHECK ("public"."has_permission"('profile.assign_roles'::"text", "public"."current_firm_id"()));



CREATE POLICY "user_roles_same_firm" ON "public"."user_role_assignments" FOR SELECT TO "authenticated" USING ((("user_id" = "public"."current_profile_id"()) OR "public"."has_permission"('profile.assign_roles'::"text", "public"."current_firm_id"())));



ALTER TABLE "public"."users" ENABLE ROW LEVEL SECURITY;


CREATE POLICY "users_select_self_or_firm" ON "public"."users" FOR SELECT TO "authenticated" USING ((("auth_user_id" = "auth"."uid"()) OR "public"."is_firm_member"("firm_id")));



GRANT USAGE ON SCHEMA "public" TO "postgres";
GRANT USAGE ON SCHEMA "public" TO "anon";
GRANT USAGE ON SCHEMA "public" TO "authenticated";
GRANT USAGE ON SCHEMA "public" TO "service_role";



GRANT ALL ON FUNCTION "public"."current_firm_id"() TO "anon";
GRANT ALL ON FUNCTION "public"."current_firm_id"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."current_firm_id"() TO "service_role";



GRANT ALL ON FUNCTION "public"."current_profile_id"() TO "anon";
GRANT ALL ON FUNCTION "public"."current_profile_id"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."current_profile_id"() TO "service_role";



GRANT ALL ON FUNCTION "public"."has_permission"("permission_key" "text", "target_firm_id" "uuid", "required_scope" "text") TO "anon";
GRANT ALL ON FUNCTION "public"."has_permission"("permission_key" "text", "target_firm_id" "uuid", "required_scope" "text") TO "authenticated";
GRANT ALL ON FUNCTION "public"."has_permission"("permission_key" "text", "target_firm_id" "uuid", "required_scope" "text") TO "service_role";



GRANT ALL ON FUNCTION "public"."is_firm_member"("target_firm_id" "uuid") TO "anon";
GRANT ALL ON FUNCTION "public"."is_firm_member"("target_firm_id" "uuid") TO "authenticated";
GRANT ALL ON FUNCTION "public"."is_firm_member"("target_firm_id" "uuid") TO "service_role";



GRANT ALL ON FUNCTION "public"."link_auth_user_to_profile"() TO "anon";
GRANT ALL ON FUNCTION "public"."link_auth_user_to_profile"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."link_auth_user_to_profile"() TO "service_role";



GRANT ALL ON FUNCTION "public"."set_admin_audit_actor"() TO "anon";
GRANT ALL ON FUNCTION "public"."set_admin_audit_actor"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."set_admin_audit_actor"() TO "service_role";



GRANT ALL ON TABLE "public"."activity_logs" TO "anon";
GRANT ALL ON TABLE "public"."activity_logs" TO "authenticated";
GRANT ALL ON TABLE "public"."activity_logs" TO "service_role";



GRANT ALL ON TABLE "public"."admin_audit_logs" TO "anon";
GRANT ALL ON TABLE "public"."admin_audit_logs" TO "authenticated";
GRANT ALL ON TABLE "public"."admin_audit_logs" TO "service_role";



GRANT ALL ON TABLE "public"."clients" TO "anon";
GRANT ALL ON TABLE "public"."clients" TO "authenticated";
GRANT ALL ON TABLE "public"."clients" TO "service_role";



GRANT ALL ON TABLE "public"."documents" TO "anon";
GRANT ALL ON TABLE "public"."documents" TO "authenticated";
GRANT ALL ON TABLE "public"."documents" TO "service_role";



GRANT ALL ON TABLE "public"."fee_note_items" TO "anon";
GRANT ALL ON TABLE "public"."fee_note_items" TO "authenticated";
GRANT ALL ON TABLE "public"."fee_note_items" TO "service_role";



GRANT ALL ON TABLE "public"."fee_notes" TO "anon";
GRANT ALL ON TABLE "public"."fee_notes" TO "authenticated";
GRANT ALL ON TABLE "public"."fee_notes" TO "service_role";



GRANT ALL ON TABLE "public"."firms" TO "anon";
GRANT ALL ON TABLE "public"."firms" TO "authenticated";
GRANT ALL ON TABLE "public"."firms" TO "service_role";



GRANT ALL ON TABLE "public"."folders" TO "anon";
GRANT ALL ON TABLE "public"."folders" TO "authenticated";
GRANT ALL ON TABLE "public"."folders" TO "service_role";



GRANT ALL ON TABLE "public"."global_settings" TO "anon";
GRANT ALL ON TABLE "public"."global_settings" TO "authenticated";
GRANT ALL ON TABLE "public"."global_settings" TO "service_role";



GRANT ALL ON TABLE "public"."matters" TO "anon";
GRANT ALL ON TABLE "public"."matters" TO "authenticated";
GRANT ALL ON TABLE "public"."matters" TO "service_role";



GRANT ALL ON TABLE "public"."messages" TO "anon";
GRANT ALL ON TABLE "public"."messages" TO "authenticated";
GRANT ALL ON TABLE "public"."messages" TO "service_role";



GRANT ALL ON TABLE "public"."notifications" TO "anon";
GRANT ALL ON TABLE "public"."notifications" TO "authenticated";
GRANT ALL ON TABLE "public"."notifications" TO "service_role";



GRANT ALL ON TABLE "public"."permission_audit_logs" TO "anon";
GRANT ALL ON TABLE "public"."permission_audit_logs" TO "authenticated";
GRANT ALL ON TABLE "public"."permission_audit_logs" TO "service_role";



GRANT ALL ON TABLE "public"."permission_catalog" TO "anon";
GRANT ALL ON TABLE "public"."permission_catalog" TO "authenticated";
GRANT ALL ON TABLE "public"."permission_catalog" TO "service_role";



GRANT ALL ON TABLE "public"."role_template_permissions" TO "anon";
GRANT ALL ON TABLE "public"."role_template_permissions" TO "authenticated";
GRANT ALL ON TABLE "public"."role_template_permissions" TO "service_role";



GRANT ALL ON TABLE "public"."role_templates" TO "anon";
GRANT ALL ON TABLE "public"."role_templates" TO "authenticated";
GRANT ALL ON TABLE "public"."role_templates" TO "service_role";



GRANT ALL ON TABLE "public"."user_permission_overrides" TO "anon";
GRANT ALL ON TABLE "public"."user_permission_overrides" TO "authenticated";
GRANT ALL ON TABLE "public"."user_permission_overrides" TO "service_role";



GRANT ALL ON TABLE "public"."user_role_assignments" TO "anon";
GRANT ALL ON TABLE "public"."user_role_assignments" TO "authenticated";
GRANT ALL ON TABLE "public"."user_role_assignments" TO "service_role";



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
