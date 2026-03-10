<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;

class OrbitumPost extends Model
{
    protected $table = 'orbitum_posts';

    protected $fillable = [
        'author_user_id',
        'visibility',
        'body',
        'image_path',
    ];
}
