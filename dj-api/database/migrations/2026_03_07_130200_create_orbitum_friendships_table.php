<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('orbitum_friendships', function (Blueprint $table) {
            $table->id();
            $table->unsignedBigInteger('user_one_id');
            $table->unsignedBigInteger('user_two_id');
            $table->timestamps();

            $table->unique(['user_one_id', 'user_two_id'], 'orbitum_friendships_pair_unique');
            $table->index(['user_one_id']);
            $table->index(['user_two_id']);
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('orbitum_friendships');
    }
};
