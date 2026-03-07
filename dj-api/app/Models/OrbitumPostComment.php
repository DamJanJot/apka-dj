<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;

class OrbitumPostComment extends Model
{
    protected $table = 'orbitum_post_comments';

    protected $fillable = [
        'post_id',
        'user_id',
        'body',
    ];
}
