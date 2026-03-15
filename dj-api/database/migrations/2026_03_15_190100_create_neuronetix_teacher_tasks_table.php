<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('neuronetix_teacher_tasks', function (Blueprint $table) {
            $table->id();
            $table->unsignedBigInteger('created_by_user_id');
            $table->unsignedBigInteger('assigned_to_user_id');
            $table->string('title', 180);
            $table->text('description')->nullable();
            $table->date('due_date')->nullable();
            $table->string('status', 24)->default('todo');
            $table->timestamp('created_at')->useCurrent();
            $table->timestamp('updated_at')->useCurrent()->useCurrentOnUpdate();

            $table->index(['created_by_user_id', 'status'], 'ntt_creator_status_idx');
            $table->index(['assigned_to_user_id', 'status'], 'ntt_assignee_status_idx');
            $table->index(['due_date', 'status'], 'ntt_due_status_idx');
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('neuronetix_teacher_tasks');
    }
};
