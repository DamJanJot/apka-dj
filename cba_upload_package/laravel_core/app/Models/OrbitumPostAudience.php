<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;

class OrbitumPostAudience extends Model
{
    protected $table = 'orbitum_post_audiences';

    protected $fillable = [
        'post_id',
        'user_id',
    ];
}
