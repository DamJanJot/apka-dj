<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;

class OrbitumFriendship extends Model
{
    protected $table = 'orbitum_friendships';

    protected $fillable = [
        'user_one_id',
        'user_two_id',
    ];
}
