-- CreateTable
CREATE TABLE "scb_user_editor_settings" (
    "id" SERIAL NOT NULL,
    "user_id" INTEGER NOT NULL,
    "word_highlight" BOOLEAN NOT NULL DEFAULT true,
    "font_size" INTEGER NOT NULL DEFAULT 16,
    "audio_rewind_seconds" INTEGER NOT NULL DEFAULT 2,
    "volume" INTEGER NOT NULL DEFAULT 100,
    "playback_speed" INTEGER NOT NULL DEFAULT 100,
    "use_native_context_menu" BOOLEAN NOT NULL DEFAULT false,
    "shortcuts" JSONB NOT NULL DEFAULT '{}',
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "scb_user_editor_settings_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "scb_user_editor_settings_user_id_key" ON "scb_user_editor_settings"("user_id");

-- AddForeignKey
ALTER TABLE "scb_user_editor_settings" ADD CONSTRAINT "scb_user_editor_settings_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "scb_users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
