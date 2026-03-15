<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('neuronetix_user_relations', function (Blueprint $table) {
            $table->id();
            $table->unsignedBigInteger('supervisor_user_id');
            $table->unsignedBigInteger('subordinate_user_id');
            $table->string('relation_type', 64);
            $table->string('activity_scope', 120)->nullable();
            $table->string('notes', 500)->nullable();
            $table->unsignedBigInteger('created_by_user_id')->nullable();
            $table->timestamp('created_at')->useCurrent();
            $table->timestamp('updated_at')->useCurrent()->useCurrentOnUpdate();

            $table->unique(['supervisor_user_id', 'subordinate_user_id', 'relation_type'], 'nur_unique_relation');
            $table->index(['relation_type', 'created_at'], 'nur_type_created_index');
            $table->index(['supervisor_user_id', 'created_at'], 'nur_supervisor_created_index');
            $table->index(['subordinate_user_id', 'created_at'], 'nur_subordinate_created_index');
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('neuronetix_user_relations');
    }
};
