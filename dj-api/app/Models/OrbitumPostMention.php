<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;

class OrbitumPostMention extends Model
{
    protected $table = 'orbitum_post_mentions';

    protected $fillable = [
        'post_id',
        'mentioned_user_id',
        'mentioned_by_user_id',
        'token',
        'read_at',
    ];

    protected $casts = [
        'read_at' => 'datetime',
    ];
}
