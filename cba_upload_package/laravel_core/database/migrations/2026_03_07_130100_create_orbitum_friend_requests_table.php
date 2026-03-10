<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('orbitum_friend_requests', function (Blueprint $table) {
            $table->id();
            $table->unsignedBigInteger('from_user_id');
            $table->unsignedBigInteger('to_user_id');
            $table->enum('status', ['pending', 'accepted', 'rejected', 'cancelled'])->default('pending');
            $table->timestamp('responded_at')->nullable();
            $table->timestamps();

            $table->index(['from_user_id', 'to_user_id']);
            $table->index(['to_user_id', 'status']);
            $table->index(['from_user_id', 'status']);
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('orbitum_friend_requests');
    }
};
