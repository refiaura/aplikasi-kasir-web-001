CREATE TYPE "public"."pay_method" AS ENUM('cash', 'qris', 'transfer', 'kasbon', 'other');--> statement-breakpoint
CREATE TYPE "public"."sale_status" AS ENUM('completed', 'voided', 'refunded');--> statement-breakpoint
CREATE TABLE "cash_movements" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"shift_id" uuid NOT NULL,
	"amount" bigint NOT NULL,
	"note" text NOT NULL,
	"created_by" uuid,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "payments" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"sale_id" uuid NOT NULL,
	"method" "pay_method" NOT NULL,
	"amount" bigint NOT NULL,
	"cash_received" bigint,
	"reference" text
);
--> statement-breakpoint
CREATE TABLE "receipt_counters" (
	"store_id" uuid NOT NULL,
	"date" text NOT NULL,
	"last_no" integer DEFAULT 0 NOT NULL,
	CONSTRAINT "receipt_counters_store_date_unique" UNIQUE("store_id","date")
);
--> statement-breakpoint
CREATE TABLE "sale_items" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"sale_id" uuid NOT NULL,
	"product_id" uuid NOT NULL,
	"name_snapshot" text NOT NULL,
	"qty" numeric(12, 3) NOT NULL,
	"unit_price" bigint NOT NULL,
	"unit_cost" bigint NOT NULL,
	"discount" bigint DEFAULT 0 NOT NULL,
	"note" text
);
--> statement-breakpoint
CREATE TABLE "sales" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"store_id" uuid NOT NULL,
	"client_txn_id" uuid NOT NULL,
	"receipt_no" text NOT NULL,
	"shift_id" uuid NOT NULL,
	"cashier_id" uuid NOT NULL,
	"subtotal" bigint NOT NULL,
	"discount" bigint DEFAULT 0 NOT NULL,
	"total" bigint NOT NULL,
	"cost_total" bigint NOT NULL,
	"status" "sale_status" DEFAULT 'completed' NOT NULL,
	"void_reason" text,
	"sold_at" timestamp with time zone NOT NULL,
	"synced_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "sales_client_txn_id_unique" UNIQUE("client_txn_id"),
	CONSTRAINT "sales_store_receipt_unique" UNIQUE("store_id","receipt_no")
);
--> statement-breakpoint
CREATE TABLE "shifts" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"store_id" uuid NOT NULL,
	"device_id" uuid NOT NULL,
	"opened_by" uuid NOT NULL,
	"closed_by" uuid,
	"opening_cash" bigint NOT NULL,
	"expected_cash" bigint,
	"counted_cash" bigint,
	"opened_at" timestamp with time zone DEFAULT now() NOT NULL,
	"closed_at" timestamp with time zone
);
--> statement-breakpoint
ALTER TABLE "sessions" ADD COLUMN "device_id" uuid;--> statement-breakpoint
ALTER TABLE "cash_movements" ADD CONSTRAINT "cash_movements_shift_id_shifts_id_fk" FOREIGN KEY ("shift_id") REFERENCES "public"."shifts"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "cash_movements" ADD CONSTRAINT "cash_movements_created_by_users_id_fk" FOREIGN KEY ("created_by") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "payments" ADD CONSTRAINT "payments_sale_id_sales_id_fk" FOREIGN KEY ("sale_id") REFERENCES "public"."sales"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "receipt_counters" ADD CONSTRAINT "receipt_counters_store_id_stores_id_fk" FOREIGN KEY ("store_id") REFERENCES "public"."stores"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "sale_items" ADD CONSTRAINT "sale_items_sale_id_sales_id_fk" FOREIGN KEY ("sale_id") REFERENCES "public"."sales"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "sale_items" ADD CONSTRAINT "sale_items_product_id_products_id_fk" FOREIGN KEY ("product_id") REFERENCES "public"."products"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "sales" ADD CONSTRAINT "sales_store_id_stores_id_fk" FOREIGN KEY ("store_id") REFERENCES "public"."stores"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "sales" ADD CONSTRAINT "sales_shift_id_shifts_id_fk" FOREIGN KEY ("shift_id") REFERENCES "public"."shifts"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "sales" ADD CONSTRAINT "sales_cashier_id_users_id_fk" FOREIGN KEY ("cashier_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "shifts" ADD CONSTRAINT "shifts_store_id_stores_id_fk" FOREIGN KEY ("store_id") REFERENCES "public"."stores"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "shifts" ADD CONSTRAINT "shifts_device_id_devices_id_fk" FOREIGN KEY ("device_id") REFERENCES "public"."devices"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "shifts" ADD CONSTRAINT "shifts_opened_by_users_id_fk" FOREIGN KEY ("opened_by") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "shifts" ADD CONSTRAINT "shifts_closed_by_users_id_fk" FOREIGN KEY ("closed_by") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "cash_movements_shift_id_idx" ON "cash_movements" USING btree ("shift_id");--> statement-breakpoint
CREATE INDEX "payments_sale_id_idx" ON "payments" USING btree ("sale_id");--> statement-breakpoint
CREATE INDEX "sale_items_sale_id_idx" ON "sale_items" USING btree ("sale_id");--> statement-breakpoint
CREATE INDEX "sales_store_sold_idx" ON "sales" USING btree ("store_id","sold_at");--> statement-breakpoint
CREATE INDEX "sales_shift_id_idx" ON "sales" USING btree ("shift_id");--> statement-breakpoint
CREATE INDEX "shifts_store_id_idx" ON "shifts" USING btree ("store_id");--> statement-breakpoint
ALTER TABLE "sessions" ADD CONSTRAINT "sessions_device_id_devices_id_fk" FOREIGN KEY ("device_id") REFERENCES "public"."devices"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE UNIQUE INDEX "one_open_shift_per_device" ON "shifts" ("device_id") WHERE "closed_at" IS NULL;
