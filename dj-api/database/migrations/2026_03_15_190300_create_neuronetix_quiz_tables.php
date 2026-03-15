<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('neuronetix_quizzes', function (Blueprint $table) {
            $table->id();
            $table->unsignedBigInteger('created_by_user_id');
            $table->string('title', 180);
            $table->text('description')->nullable();
            $table->date('due_date')->nullable();
            $table->boolean('is_active')->default(true);
            $table->timestamp('created_at')->useCurrent();
            $table->timestamp('updated_at')->useCurrent()->useCurrentOnUpdate();

            $table->index(['created_by_user_id', 'is_active'], 'nq_creator_active_idx');
            $table->index(['due_date', 'is_active'], 'nq_due_active_idx');
        });

        Schema::create('neuronetix_quiz_questions', function (Blueprint $table) {
            $table->id();
            $table->unsignedBigInteger('quiz_id');
            $table->unsignedInteger('position')->default(1);
            $table->text('question_text');
            $table->string('question_type', 24)->default('text');
            $table->text('options_json')->nullable();
            $table->text('correct_answer')->nullable();
            $table->unsignedInteger('points')->default(1);
            $table->timestamp('created_at')->useCurrent();
            $table->timestamp('updated_at')->useCurrent()->useCurrentOnUpdate();

            $table->index(['quiz_id', 'position'], 'nqq_quiz_pos_idx');
        });

        Schema::create('neuronetix_quiz_assignments', function (Blueprint $table) {
            $table->id();
            $table->unsignedBigInteger('quiz_id');
            $table->unsignedBigInteger('student_user_id');
            $table->unsignedInteger('attempt_count')->default(0);
            $table->unsignedInteger('score')->nullable();
            $table->unsignedInteger('max_score')->nullable();
            $table->string('status', 24)->default('assigned');
            $table->text('answers_json')->nullable();
            $table->timestamp('submitted_at')->nullable();
            $table->timestamp('created_at')->useCurrent();
            $table->timestamp('updated_at')->useCurrent()->useCurrentOnUpdate();

            $table->unique(['quiz_id', 'student_user_id'], 'nqa_quiz_student_unique');
            $table->index(['student_user_id', 'status'], 'nqa_student_status_idx');
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('neuronetix_quiz_assignments');
        Schema::dropIfExists('neuronetix_quiz_questions');
        Schema::dropIfExists('neuronetix_quizzes');
    }
};
