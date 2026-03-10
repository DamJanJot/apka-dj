<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;

class OrbitumCommentMention extends Model
{
    protected $table = 'orbitum_comment_mentions';

    protected $fillable = [
        'comment_id',
        'mentioned_user_id',
        'mentioned_by_user_id',
        'token',
        'read_at',
    ];

    protected $casts = [
        'read_at' => 'datetime',
    ];
}
