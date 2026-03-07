<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;

class OrbitumPostReaction extends Model
{
    protected $table = 'orbitum_post_reactions';

    protected $fillable = [
        'post_id',
        'user_id',
        'emoji',
    ];
}
