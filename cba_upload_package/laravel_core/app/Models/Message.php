<?php
namespace App\Models;

use Illuminate\Database\Eloquent\Model;

class Message extends Model
{
    protected $table = 'wiadomosci';
    public $timestamps = false;
    protected $fillable = ['nadawca_id','odbiorca_id','tresc','przeczytana'];
    protected $casts = ['przeczytana' => 'bool'];
}
