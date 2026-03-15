<?php

namespace App\Http\Controllers;

use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Schema;

class TeacherPanelController extends Controller
{
    public function overview(Request $request)
    {
        $user = $request->user();
        if (!$user) {
            return response()->json(['message' => 'Brak autoryzacji.'], 401);
        }

        if (!Schema::hasTable('neuronetix_user_relations')) {
            return response()->json([
                'students' => [],
                'meta' => [
                    'total' => 0,
                    'by_type' => [],
                ],
                'warning' => 'Tabela relacji nie istnieje jeszcze w bazie.',
            ]);
        }

        $rows = DB::table('neuronetix_user_relations as r')
            ->leftJoin('uzytkownicy as s', 's.id', '=', 'r.subordinate_user_id')
            ->where('r.supervisor_user_id', (int) $user->id)
            ->orderBy('s.imie')
            ->orderBy('s.nick')
            ->orderBy('s.email')
            ->get([
                'r.id',
                'r.relation_type',
                'r.activity_scope',
                'r.notes',
                'r.updated_at',
                's.id as student_id',
                's.imie as student_imie',
                's.nick as student_nick',
                's.email as student_email',
                's.rola as student_role',
            ]);

        $students = $rows->map(function (object $row) {
            return [
                'relation_id' => (int) $row->id,
                'relation_type' => (string) $row->relation_type,
                'activity_scope' => $row->activity_scope ? (string) $row->activity_scope : null,
                'notes' => $row->notes ? (string) $row->notes : null,
                'updated_at' => (string) $row->updated_at,
                'student' => [
                    'id' => (int) $row->student_id,
                    'imie' => $row->student_imie ? (string) $row->student_imie : null,
                    'nick' => $row->student_nick ? (string) $row->student_nick : null,
                    'email' => $row->student_email ? (string) $row->student_email : null,
                    'rola' => $row->student_role ? strtolower((string) $row->student_role) : null,
                ],
            ];
        })->values();

        $byType = $rows
            ->groupBy(static fn (object $row): string => (string) $row->relation_type)
            ->map(static fn ($items): int => $items->count())
            ->all();

        return response()->json([
            'students' => $students,
            'meta' => [
                'total' => $students->count(),
                'by_type' => $byType,
            ],
        ]);
    }
}
