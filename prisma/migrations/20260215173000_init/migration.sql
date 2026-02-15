-- CreateSchema
CREATE SCHEMA IF NOT EXISTS "public";

-- CreateTable
CREATE TABLE "registrations" (
    "id" TEXT NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,
    "source_type" TEXT NOT NULL,
    "external_id" TEXT NOT NULL,
    "source_ref" TEXT,
    "email" TEXT,
    "first_name" TEXT,
    "last_name" TEXT,
    "raw_data" JSONB NOT NULL,
    "validation_status" TEXT NOT NULL DEFAULT 'PENDING',
    "validation_errors" JSONB,
    "sync_status" TEXT NOT NULL DEFAULT 'PENDING',
    "hubspot_id" TEXT,

    CONSTRAINT "registrations_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "sync_runs" (
    "id" TEXT NOT NULL,
    "started_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "completed_at" TIMESTAMP(3),
    "status" TEXT NOT NULL DEFAULT 'RUNNING',
    "triggered_by" TEXT,
    "total_records" INTEGER NOT NULL DEFAULT 0,
    "synced_records" INTEGER NOT NULL DEFAULT 0,
    "failed_records" INTEGER NOT NULL DEFAULT 0,
    "skipped_records" INTEGER NOT NULL DEFAULT 0,

    CONSTRAINT "sync_runs_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "sync_records" (
    "id" TEXT NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "sync_run_id" TEXT NOT NULL,
    "registration_id" TEXT NOT NULL,
    "action" TEXT NOT NULL,
    "hubspot_id" TEXT,
    "error_message" TEXT,
    "duration_ms" INTEGER,

    CONSTRAINT "sync_records_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "field_mappings" (
    "id" TEXT NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,
    "source_type" TEXT NOT NULL,
    "source_field" TEXT NOT NULL,
    "hubspot_object" TEXT NOT NULL,
    "hubspot_property" TEXT NOT NULL,
    "transform_fn" TEXT,
    "is_active" BOOLEAN NOT NULL DEFAULT true,

    CONSTRAINT "field_mappings_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "registrations_email_idx" ON "registrations"("email");

-- CreateIndex
CREATE UNIQUE INDEX "registrations_source_type_external_id_key" ON "registrations"("source_type", "external_id");

-- CreateIndex
CREATE UNIQUE INDEX "field_mappings_source_type_source_field_hubspot_object_hubs_key" ON "field_mappings"("source_type", "source_field", "hubspot_object", "hubspot_property");

-- AddForeignKey
ALTER TABLE "sync_records" ADD CONSTRAINT "sync_records_sync_run_id_fkey" FOREIGN KEY ("sync_run_id") REFERENCES "sync_runs"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "sync_records" ADD CONSTRAINT "sync_records_registration_id_fkey" FOREIGN KEY ("registration_id") REFERENCES "registrations"("id") ON DELETE CASCADE ON UPDATE CASCADE;

