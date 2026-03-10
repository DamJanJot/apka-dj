<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('orbitum_post_reactions', function (Blueprint $table) {
            $table->id();
            $table->unsignedBigInteger('post_id');
            $table->unsignedBigInteger('user_id');
            $table->string('emoji', 32);
            $table->timestamps();

            $table->unique(['post_id', 'user_id'], 'orbitum_post_reaction_unique');
            $table->index(['post_id', 'emoji']);
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('orbitum_post_reactions');
    }
};
