<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('neuronetix_role_change_logs', function (Blueprint $table) {
            $table->id();
            $table->unsignedBigInteger('acted_by_user_id');
            $table->unsignedBigInteger('target_user_id');
            $table->string('old_role', 64)->nullable();
            $table->string('new_role', 64);
            $table->string('reason', 500)->nullable();
            $table->string('ip_address', 45)->nullable();
            $table->string('user_agent', 255)->nullable();
            $table->timestamp('created_at')->useCurrent();

            $table->index(['target_user_id', 'created_at']);
            $table->index(['acted_by_user_id', 'created_at']);
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('neuronetix_role_change_logs');
    }
};
