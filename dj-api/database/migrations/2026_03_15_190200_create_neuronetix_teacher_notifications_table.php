<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('neuronetix_teacher_notifications', function (Blueprint $table) {
            $table->id();
            $table->unsignedBigInteger('to_user_id');
            $table->unsignedBigInteger('from_user_id')->nullable();
            $table->unsignedBigInteger('task_id')->nullable();
            $table->unsignedBigInteger('quiz_id')->nullable();
            $table->string('type', 48);
            $table->string('title', 180);
            $table->text('message')->nullable();
            $table->timestamp('read_at')->nullable();
            $table->timestamp('created_at')->useCurrent();

            $table->index(['to_user_id', 'read_at'], 'ntn_user_read_idx');
            $table->index(['type', 'created_at'], 'ntn_type_created_idx');
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('neuronetix_teacher_notifications');
    }
};
