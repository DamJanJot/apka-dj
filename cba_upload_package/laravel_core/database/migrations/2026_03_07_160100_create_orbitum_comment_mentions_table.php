<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('orbitum_comment_mentions', function (Blueprint $table) {
            $table->id();
            $table->unsignedBigInteger('comment_id');
            $table->unsignedBigInteger('mentioned_user_id');
            $table->unsignedBigInteger('mentioned_by_user_id');
            $table->string('token', 120);
            $table->timestamp('read_at')->nullable();
            $table->timestamps();

            $table->index(['mentioned_user_id', 'read_at']);
            $table->index(['comment_id']);
            $table->unique(['comment_id', 'mentioned_user_id'], 'orbitum_comment_mention_unique');
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('orbitum_comment_mentions');
    }
};
