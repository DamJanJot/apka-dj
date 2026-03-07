<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::table('orbitum_chat_messages', function (Blueprint $table) {
            $table->string('image_path', 500)->nullable()->after('body');
            $table->boolean('is_mention')->default(false)->after('image_path');

            $table->index(['to_user_id', 'is_mention', 'read_at'], 'orbitum_chat_to_mention_read_idx');
        });
    }

    public function down(): void
    {
        Schema::table('orbitum_chat_messages', function (Blueprint $table) {
            $table->dropIndex('orbitum_chat_to_mention_read_idx');
            $table->dropColumn(['image_path', 'is_mention']);
        });
    }
};
