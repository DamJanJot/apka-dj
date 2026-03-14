<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('optivio_tasks', function (Blueprint $table) {
            $table->id();
            $table->unsignedBigInteger('project_id');
            $table->unsignedBigInteger('user_id');
            $table->string('title', 190);
            $table->text('description')->nullable();
            $table->date('due_date')->nullable();
            $table->enum('status', ['ready', 'progress', 'review', 'done'])->default('ready');
            $table->boolean('taskora_synced')->default(false);
            $table->string('taskora_task_id', 100)->nullable();
            $table->timestamp('taskora_last_attempt_at')->nullable();
            $table->string('taskora_error', 500)->nullable();
            $table->timestamps();

            $table->index(['project_id', 'created_at']);
            $table->index(['project_id', 'status']);
            $table->index(['user_id', 'status']);
            $table->index(['user_id', 'due_date']);
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('optivio_tasks');
    }
};
