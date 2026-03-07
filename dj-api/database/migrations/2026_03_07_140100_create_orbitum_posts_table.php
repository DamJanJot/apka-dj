<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('orbitum_posts', function (Blueprint $table) {
            $table->id();
            $table->unsignedBigInteger('author_user_id');
            $table->enum('visibility', ['public', 'friends', 'selected'])->default('public');
            $table->text('body')->nullable();
            $table->string('image_path', 500)->nullable();
            $table->timestamps();

            $table->index(['author_user_id', 'created_at']);
            $table->index(['visibility', 'created_at']);
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('orbitum_posts');
    }
};
