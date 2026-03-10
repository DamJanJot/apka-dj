<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('orbitum_post_audiences', function (Blueprint $table) {
            $table->id();
            $table->unsignedBigInteger('post_id');
            $table->unsignedBigInteger('user_id');
            $table->timestamps();

            $table->unique(['post_id', 'user_id'], 'orbitum_post_audience_unique');
            $table->index(['user_id']);
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('orbitum_post_audiences');
    }
};
