<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('orbitum_makao_rooms', function (Blueprint $table) {
            $table->id();
            $table->unsignedBigInteger('player_one_id');
            $table->unsignedBigInteger('player_two_id');
            $table->enum('status', ['active', 'finished'])->default('active');
            $table->unsignedBigInteger('turn_user_id')->nullable();
            $table->unsignedBigInteger('last_action_by_user_id')->nullable();
            $table->json('state_json')->nullable();
            $table->unsignedInteger('action_version')->default(0);
            $table->timestamps();

            $table->index(['player_one_id', 'status']);
            $table->index(['player_two_id', 'status']);
            $table->index(['status', 'updated_at']);
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('orbitum_makao_rooms');
    }
};
