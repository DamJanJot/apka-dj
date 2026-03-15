<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('neuronetix_task_whiteboard_notes', function (Blueprint $table) {
            $table->id();
            $table->unsignedBigInteger('task_id');
            $table->unsignedBigInteger('user_id');
            $table->text('note_text')->nullable();
            $table->integer('pos_x')->default(80);
            $table->integer('pos_y')->default(80);
            $table->string('color', 30)->default('#fff59d');
            $table->timestamp('created_at')->useCurrent();
            $table->timestamp('updated_at')->useCurrent()->useCurrentOnUpdate();

            $table->index(['task_id', 'user_id'], 'ntwn_task_user_idx');
            $table->index(['task_id'], 'ntwn_task_idx');
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('neuronetix_task_whiteboard_notes');
    }
};
