<?php

namespace App\Http\Controllers;

use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Schema;

class TeacherPanelController extends Controller
{
    private const TASK_STATUSES = ['todo', 'workflow', 'submitted'];

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

    public function tasks(Request $request)
    {
        if (!Schema::hasTable('neuronetix_teacher_tasks')) {
            return response()->json(['data' => []]);
        }

        $user = $request->user();
        if (!$user) {
            return response()->json(['message' => 'Brak autoryzacji.'], 401);
        }

        $data = $request->validate([
            'status' => ['nullable', 'string', 'max:24'],
            'student_user_id' => ['nullable', 'integer', 'min:1'],
        ]);

        $role = strtolower(trim((string) ($user->rola ?? '')));
        $query = DB::table('neuronetix_teacher_tasks as t')
            ->leftJoin('uzytkownicy as c', 'c.id', '=', 't.created_by_user_id')
            ->leftJoin('uzytkownicy as a', 'a.id', '=', 't.assigned_to_user_id')
            ->select([
                't.id',
                't.created_by_user_id',
                't.assigned_to_user_id',
                't.title',
                't.description',
                't.due_date',
                't.status',
                't.has_whiteboard',
                't.created_at',
                't.updated_at',
                'c.imie as creator_imie',
                'c.nick as creator_nick',
                'c.email as creator_email',
                'a.imie as assignee_imie',
                'a.nick as assignee_nick',
                'a.email as assignee_email',
            ])
            ->orderByDesc('t.id');

        if ($role === 'uczen' || $role === 'student') {
            $query->where('t.assigned_to_user_id', (int) $user->id);
        } else {
            $query->where('t.created_by_user_id', (int) $user->id);
            if (!empty($data['student_user_id'])) {
                $query->where('t.assigned_to_user_id', (int) $data['student_user_id']);
            }
        }

        if (!empty($data['status'])) {
            $query->whereIn('t.status', $this->taskStatusQueryCandidates((string) $data['status']));
        }

        $rows = $query->get();

        return response()->json([
            'data' => $rows->map(fn (object $row) => $this->serializeTaskRow($row))->values(),
            'meta' => [
                'total' => $rows->count(),
            ],
        ]);
    }

    public function createTask(Request $request)
    {
        if (!Schema::hasTable('neuronetix_teacher_tasks')) {
            return response()->json(['message' => 'Tabela zadan nie istnieje jeszcze w bazie.'], 422);
        }

        $user = $request->user();
        if (!$user) {
            return response()->json(['message' => 'Brak autoryzacji.'], 401);
        }

        $data = $request->validate([
            'assigned_to_user_id' => ['required', 'integer', 'min:1'],
            'title' => ['required', 'string', 'max:180'],
            'description' => ['nullable', 'string', 'max:5000'],
            'due_date' => ['nullable', 'date'],
            'status' => ['nullable', 'string', 'max:24'],
            'has_whiteboard' => ['nullable', 'boolean'],
        ]);

        $assignedTo = (int) $data['assigned_to_user_id'];
        if (!$this->canAssignStudent((int) $user->id, $assignedTo, (string) ($user->rola ?? ''))) {
            return response()->json(['message' => 'Brak uprawnien do przypisania zadania dla tego ucznia.'], 403);
        }

        $status = $this->normalizeTaskStatus((string) ($data['status'] ?? 'todo'));

        $now = now();
        $taskId = DB::table('neuronetix_teacher_tasks')->insertGetId([
            'created_by_user_id' => (int) $user->id,
            'assigned_to_user_id' => $assignedTo,
            'title' => trim((string) $data['title']),
            'description' => trim((string) ($data['description'] ?? '')) ?: null,
            'due_date' => $data['due_date'] ?? null,
            'status' => $status,
            'has_whiteboard' => (bool) ($data['has_whiteboard'] ?? false),
            'created_at' => $now,
            'updated_at' => $now,
        ]);

        $this->createNotification(
            toUserId: $assignedTo,
            fromUserId: (int) $user->id,
            type: 'task_created',
            title: 'Nowe zadanie',
            message: 'Nauczyciel przypisal Ci nowe zadanie.',
            taskId: (int) $taskId
        );

        return response()->json(['ok' => true, 'task_id' => (int) $taskId], 201);
    }

    public function updateTask(Request $request, int $taskId)
    {
        if (!Schema::hasTable('neuronetix_teacher_tasks')) {
            return response()->json(['message' => 'Tabela zadan nie istnieje jeszcze w bazie.'], 422);
        }

        $user = $request->user();
        if (!$user) {
            return response()->json(['message' => 'Brak autoryzacji.'], 401);
        }

        $task = DB::table('neuronetix_teacher_tasks')->where('id', $taskId)->first();
        if (!$task) {
            return response()->json(['message' => 'Zadanie nie zostalo znalezione.'], 404);
        }

        if (!$this->canManageTask((int) $user->id, (string) ($user->rola ?? ''), (int) $task->created_by_user_id)) {
            return response()->json(['message' => 'Brak uprawnien do edycji tego zadania.'], 403);
        }

        $data = $request->validate([
            'title' => ['nullable', 'string', 'max:180'],
            'description' => ['nullable', 'string', 'max:5000'],
            'due_date' => ['nullable', 'date'],
            'status' => ['nullable', 'string', 'max:24'],
            'has_whiteboard' => ['nullable', 'boolean'],
        ]);

        $update = ['updated_at' => now()];
        if (array_key_exists('title', $data)) {
            $update['title'] = trim((string) $data['title']);
        }
        if (array_key_exists('description', $data)) {
            $update['description'] = trim((string) $data['description']) ?: null;
        }
        if (array_key_exists('due_date', $data)) {
            $update['due_date'] = $data['due_date'] ?: null;
        }
        if (array_key_exists('status', $data)) {
            $update['status'] = $this->normalizeTaskStatus((string) $data['status']);
        }
        if (array_key_exists('has_whiteboard', $data)) {
            $update['has_whiteboard'] = (bool) $data['has_whiteboard'];
        }

        if (count($update) === 1) {
            return response()->json(['ok' => true]);
        }

        DB::table('neuronetix_teacher_tasks')->where('id', $taskId)->update($update);

        if (isset($update['status']) && $update['status'] !== (string) $task->status) {
            $this->createNotification(
                toUserId: (int) $task->assigned_to_user_id,
                fromUserId: (int) $user->id,
                type: 'task_updated',
                title: 'Aktualizacja zadania',
                message: 'Status lub szczegoly zadania zostaly zmienione.',
                taskId: (int) $taskId
            );
        }

        return response()->json(['ok' => true]);
    }

    public function updateTaskStatus(Request $request, int $taskId)
    {
        if (!Schema::hasTable('neuronetix_teacher_tasks')) {
            return response()->json(['message' => 'Tabela zadan nie istnieje jeszcze w bazie.'], 422);
        }

        $user = $request->user();
        if (!$user) {
            return response()->json(['message' => 'Brak autoryzacji.'], 401);
        }

        $task = DB::table('neuronetix_teacher_tasks')->where('id', $taskId)->first();
        if (!$task) {
            return response()->json(['message' => 'Zadanie nie zostalo znalezione.'], 404);
        }

        $role = strtolower(trim((string) ($user->rola ?? '')));
        $isOwnerOrAdmin = in_array($role, ['owner', 'admin'], true);
        $isTeacher = (int) $task->created_by_user_id === (int) $user->id;
        $isStudent = (int) $task->assigned_to_user_id === (int) $user->id;
        if (!$isOwnerOrAdmin && !$isTeacher && !$isStudent) {
            return response()->json(['message' => 'Brak uprawnien do zmiany statusu tego zadania.'], 403);
        }

        $data = $request->validate([
            'status' => ['required', 'string', 'max:24'],
        ]);

        $status = $this->normalizeTaskStatus((string) $data['status']);
        if (!in_array($status, self::TASK_STATUSES, true)) {
            return response()->json(['message' => 'Nieprawidlowy status zadania.'], 422);
        }

        DB::table('neuronetix_teacher_tasks')->where('id', $taskId)->update([
            'status' => $status,
            'updated_at' => now(),
        ]);

        if ($isStudent && !$isTeacher) {
            $this->createNotification(
                toUserId: (int) $task->created_by_user_id,
                fromUserId: (int) $user->id,
                type: 'task_status_changed',
                title: 'Uczen zmienil status zadania',
                message: 'Uczen zaktualizowal status przypisanego zadania.',
                taskId: (int) $taskId
            );
        }

        return response()->json(['ok' => true]);
    }

    public function deleteTask(Request $request, int $taskId)
    {
        if (!Schema::hasTable('neuronetix_teacher_tasks')) {
            return response()->json(['message' => 'Tabela zadan nie istnieje jeszcze w bazie.'], 422);
        }

        $user = $request->user();
        if (!$user) {
            return response()->json(['message' => 'Brak autoryzacji.'], 401);
        }

        $task = DB::table('neuronetix_teacher_tasks')->where('id', $taskId)->first();
        if (!$task) {
            return response()->json(['message' => 'Zadanie nie zostalo znalezione.'], 404);
        }

        if (!$this->canManageTask((int) $user->id, (string) ($user->rola ?? ''), (int) $task->created_by_user_id)) {
            return response()->json(['message' => 'Brak uprawnien do usuniecia tego zadania.'], 403);
        }

        DB::table('neuronetix_teacher_tasks')->where('id', $taskId)->delete();
        if (Schema::hasTable('neuronetix_teacher_notifications')) {
            DB::table('neuronetix_teacher_notifications')->where('task_id', $taskId)->delete();
        }

        return response()->json(['ok' => true]);
    }

    public function taskWhiteboardNotes(Request $request, int $taskId)
    {
        if (!Schema::hasTable('neuronetix_task_whiteboard_notes')) {
            return response()->json(['data' => []]);
        }

        $user = $request->user();
        if (!$user) {
            return response()->json(['message' => 'Brak autoryzacji.'], 401);
        }

        $task = DB::table('neuronetix_teacher_tasks')->where('id', $taskId)->first();
        if (!$task) {
            return response()->json(['message' => 'Zadanie nie zostalo znalezione.'], 404);
        }

        $role = strtolower(trim((string) ($user->rola ?? '')));
        $isOwnerOrAdmin = in_array($role, ['owner', 'admin'], true);
        $isTeacher = (int) $task->created_by_user_id === (int) $user->id;
        $isStudent = (int) $task->assigned_to_user_id === (int) $user->id;
        if (!$isOwnerOrAdmin && !$isTeacher && !$isStudent) {
            return response()->json(['message' => 'Brak dostepu do tablicy zadania.'], 403);
        }

        $rows = DB::table('neuronetix_task_whiteboard_notes')
            ->where('task_id', $taskId)
            ->orderBy('id')
            ->get([
                'id',
                'task_id',
                'user_id',
                'note_text',
                'pos_x',
                'pos_y',
                'color',
                'created_at',
                'updated_at',
            ]);

        return response()->json([
            'data' => $rows->map(function (object $row) {
                return [
                    'id' => (int) $row->id,
                    'task_id' => (int) $row->task_id,
                    'user_id' => (int) $row->user_id,
                    'text' => $row->note_text ? (string) $row->note_text : null,
                    'pos_x' => (int) $row->pos_x,
                    'pos_y' => (int) $row->pos_y,
                    'color' => (string) $row->color,
                    'updated_at' => (string) $row->updated_at,
                ];
            })->values(),
        ]);
    }

    public function saveTaskWhiteboardNote(Request $request, int $taskId)
    {
        if (!Schema::hasTable('neuronetix_task_whiteboard_notes')) {
            return response()->json(['message' => 'Tabela tablicy zadan nie istnieje jeszcze w bazie.'], 422);
        }

        $user = $request->user();
        if (!$user) {
            return response()->json(['message' => 'Brak autoryzacji.'], 401);
        }

        $task = DB::table('neuronetix_teacher_tasks')->where('id', $taskId)->first();
        if (!$task) {
            return response()->json(['message' => 'Zadanie nie zostalo znalezione.'], 404);
        }

        $role = strtolower(trim((string) ($user->rola ?? '')));
        $isOwnerOrAdmin = in_array($role, ['owner', 'admin'], true);
        $isTeacher = (int) $task->created_by_user_id === (int) $user->id;
        $isStudent = (int) $task->assigned_to_user_id === (int) $user->id;
        if (!$isOwnerOrAdmin && !$isTeacher && !$isStudent) {
            return response()->json(['message' => 'Brak dostepu do tablicy zadania.'], 403);
        }

        $data = $request->validate([
            'id' => ['nullable', 'integer', 'min:1'],
            'text' => ['nullable', 'string', 'max:6000'],
            'pos_x' => ['nullable', 'integer'],
            'pos_y' => ['nullable', 'integer'],
            'color' => ['nullable', 'string', 'max:30'],
        ]);

        $payload = [
            'task_id' => $taskId,
            'user_id' => (int) $user->id,
            'note_text' => trim((string) ($data['text'] ?? '')) ?: null,
            'pos_x' => (int) ($data['pos_x'] ?? 80),
            'pos_y' => (int) ($data['pos_y'] ?? 80),
            'color' => trim((string) ($data['color'] ?? '#fff59d')) ?: '#fff59d',
            'updated_at' => now(),
        ];

        if (!empty($data['id'])) {
            $updated = DB::table('neuronetix_task_whiteboard_notes')
                ->where('id', (int) $data['id'])
                ->where('user_id', (int) $user->id)
                ->where('task_id', $taskId)
                ->update($payload);

            if ($updated) {
                return response()->json(['ok' => true, 'id' => (int) $data['id']]);
            }
        }

        $payload['created_at'] = now();
        $id = DB::table('neuronetix_task_whiteboard_notes')->insertGetId($payload);

        return response()->json(['ok' => true, 'id' => (int) $id], 201);
    }

    public function deleteTaskWhiteboardNote(Request $request, int $taskId, int $noteId)
    {
        if (!Schema::hasTable('neuronetix_task_whiteboard_notes')) {
            return response()->json(['ok' => true]);
        }

        $user = $request->user();
        if (!$user) {
            return response()->json(['message' => 'Brak autoryzacji.'], 401);
        }

        DB::table('neuronetix_task_whiteboard_notes')
            ->where('id', $noteId)
            ->where('task_id', $taskId)
            ->where('user_id', (int) $user->id)
            ->delete();

        return response()->json(['ok' => true]);
    }

    public function notifications(Request $request)
    {
        if (!Schema::hasTable('neuronetix_teacher_notifications')) {
            return response()->json(['data' => [], 'unread' => 0]);
        }

        $user = $request->user();
        if (!$user) {
            return response()->json(['message' => 'Brak autoryzacji.'], 401);
        }

        $rows = DB::table('neuronetix_teacher_notifications as n')
            ->leftJoin('uzytkownicy as f', 'f.id', '=', 'n.from_user_id')
            ->where('n.to_user_id', (int) $user->id)
            ->orderByDesc('n.id')
            ->get([
                'n.id',
                'n.type',
                'n.title',
                'n.message',
                'n.task_id',
                'n.quiz_id',
                'n.read_at',
                'n.created_at',
                'f.id as from_id',
                'f.imie as from_imie',
                'f.nick as from_nick',
                'f.email as from_email',
            ]);

        return response()->json([
            'data' => $rows->map(function (object $row) {
                return [
                    'id' => (int) $row->id,
                    'type' => (string) $row->type,
                    'title' => (string) $row->title,
                    'message' => $row->message ? (string) $row->message : null,
                    'task_id' => $row->task_id ? (int) $row->task_id : null,
                    'quiz_id' => $row->quiz_id ? (int) $row->quiz_id : null,
                    'read_at' => $row->read_at ? (string) $row->read_at : null,
                    'created_at' => (string) $row->created_at,
                    'from' => [
                        'id' => $row->from_id ? (int) $row->from_id : null,
                        'imie' => $row->from_imie ? (string) $row->from_imie : null,
                        'nick' => $row->from_nick ? (string) $row->from_nick : null,
                        'email' => $row->from_email ? (string) $row->from_email : null,
                    ],
                ];
            })->values(),
            'unread' => $rows->whereNull('read_at')->count(),
        ]);
    }

    public function markNotificationRead(Request $request, int $notificationId)
    {
        if (!Schema::hasTable('neuronetix_teacher_notifications')) {
            return response()->json(['ok' => true]);
        }

        $user = $request->user();
        if (!$user) {
            return response()->json(['message' => 'Brak autoryzacji.'], 401);
        }

        DB::table('neuronetix_teacher_notifications')
            ->where('id', $notificationId)
            ->where('to_user_id', (int) $user->id)
            ->update(['read_at' => now()]);

        return response()->json(['ok' => true]);
    }

    public function markNotificationsReadAll(Request $request)
    {
        if (!Schema::hasTable('neuronetix_teacher_notifications')) {
            return response()->json(['ok' => true]);
        }

        $user = $request->user();
        if (!$user) {
            return response()->json(['message' => 'Brak autoryzacji.'], 401);
        }

        DB::table('neuronetix_teacher_notifications')
            ->where('to_user_id', (int) $user->id)
            ->whereNull('read_at')
            ->update(['read_at' => now()]);

        return response()->json(['ok' => true]);
    }

    public function quizzes(Request $request)
    {
        if (!Schema::hasTable('neuronetix_quizzes')) {
            return response()->json(['data' => []]);
        }

        $user = $request->user();
        if (!$user) {
            return response()->json(['message' => 'Brak autoryzacji.'], 401);
        }

        $role = strtolower(trim((string) ($user->rola ?? '')));

        if ($role === 'uczen' || $role === 'student') {
            $rows = DB::table('neuronetix_quiz_assignments as qa')
                ->join('neuronetix_quizzes as q', 'q.id', '=', 'qa.quiz_id')
                ->leftJoin('uzytkownicy as t', 't.id', '=', 'q.created_by_user_id')
                ->where('qa.student_user_id', (int) $user->id)
                ->orderByDesc('q.id')
                ->get([
                    'q.id',
                    'q.title',
                    'q.description',
                    'q.due_date',
                    'q.is_active',
                    'q.created_at',
                    'q.updated_at',
                    'qa.status as assignment_status',
                    'qa.score',
                    'qa.max_score',
                    'qa.submitted_at',
                    't.imie as teacher_imie',
                    't.nick as teacher_nick',
                    't.email as teacher_email',
                ]);

            return response()->json([
                'data' => $rows->map(function (object $row) {
                    return [
                        'id' => (int) $row->id,
                        'title' => (string) $row->title,
                        'description' => $row->description ? (string) $row->description : null,
                        'due_date' => $row->due_date ? (string) $row->due_date : null,
                        'is_active' => (bool) $row->is_active,
                        'assignment_status' => (string) $row->assignment_status,
                        'score' => $row->score !== null ? (int) $row->score : null,
                        'max_score' => $row->max_score !== null ? (int) $row->max_score : null,
                        'submitted_at' => $row->submitted_at ? (string) $row->submitted_at : null,
                        'teacher' => [
                            'imie' => $row->teacher_imie ? (string) $row->teacher_imie : null,
                            'nick' => $row->teacher_nick ? (string) $row->teacher_nick : null,
                            'email' => $row->teacher_email ? (string) $row->teacher_email : null,
                        ],
                    ];
                })->values(),
            ]);
        }

        $rows = DB::table('neuronetix_quizzes as q')
            ->where('q.created_by_user_id', (int) $user->id)
            ->orderByDesc('q.id')
            ->get([
                'q.id',
                'q.title',
                'q.description',
                'q.due_date',
                'q.is_active',
                'q.created_at',
                'q.updated_at',
            ]);

        $quizIds = $rows->pluck('id')->values();
        $questionCounts = [];
        $assignedCounts = [];
        if ($quizIds->isNotEmpty()) {
            $questionCounts = DB::table('neuronetix_quiz_questions')
                ->selectRaw('quiz_id, COUNT(*) as cnt')
                ->whereIn('quiz_id', $quizIds)
                ->groupBy('quiz_id')
                ->pluck('cnt', 'quiz_id')
                ->all();

            $assignedCounts = DB::table('neuronetix_quiz_assignments')
                ->selectRaw('quiz_id, COUNT(*) as cnt')
                ->whereIn('quiz_id', $quizIds)
                ->groupBy('quiz_id')
                ->pluck('cnt', 'quiz_id')
                ->all();
        }

        return response()->json([
            'data' => $rows->map(function (object $row) use ($questionCounts, $assignedCounts) {
                $quizId = (int) $row->id;
                return [
                    'id' => $quizId,
                    'title' => (string) $row->title,
                    'description' => $row->description ? (string) $row->description : null,
                    'due_date' => $row->due_date ? (string) $row->due_date : null,
                    'is_active' => (bool) $row->is_active,
                    'questions_count' => (int) ($questionCounts[$quizId] ?? 0),
                    'assigned_count' => (int) ($assignedCounts[$quizId] ?? 0),
                ];
            })->values(),
        ]);
    }

    public function quizDetail(Request $request, int $quizId)
    {
        if (!Schema::hasTable('neuronetix_quizzes')) {
            return response()->json(['message' => 'Tabela quizow nie istnieje jeszcze w bazie.'], 422);
        }

        $user = $request->user();
        if (!$user) {
            return response()->json(['message' => 'Brak autoryzacji.'], 401);
        }

        $quiz = DB::table('neuronetix_quizzes')->where('id', $quizId)->first();
        if (!$quiz) {
            return response()->json(['message' => 'Quiz nie zostal znaleziony.'], 404);
        }

        $role = strtolower(trim((string) ($user->rola ?? '')));
        $isOwnerOrAdmin = in_array($role, ['owner', 'admin'], true);
        $isCreator = (int) $quiz->created_by_user_id === (int) $user->id;

        if (!$isOwnerOrAdmin && !$isCreator) {
            $isAssigned = DB::table('neuronetix_quiz_assignments')
                ->where('quiz_id', $quizId)
                ->where('student_user_id', (int) $user->id)
                ->exists();
            if (!$isAssigned) {
                return response()->json(['message' => 'Brak dostepu do quizu.'], 403);
            }
        }

        $questions = DB::table('neuronetix_quiz_questions')
            ->where('quiz_id', $quizId)
            ->orderBy('position')
            ->get([
                'id',
                'position',
                'question_text',
                'question_type',
                'options_json',
                'correct_answer',
                'points',
            ])
            ->map(function (object $row) use ($isOwnerOrAdmin, $isCreator) {
                $options = [];
                if (!empty($row->options_json)) {
                    $decoded = json_decode((string) $row->options_json, true);
                    if (is_array($decoded)) {
                        $options = array_values(array_map(static fn ($item): string => (string) $item, $decoded));
                    }
                }

                return [
                    'id' => (int) $row->id,
                    'position' => (int) $row->position,
                    'question_text' => (string) $row->question_text,
                    'question_type' => (string) $row->question_type,
                    'options' => $options,
                    'points' => (int) $row->points,
                    'correct_answer' => ($isOwnerOrAdmin || $isCreator) ? ($row->correct_answer ? (string) $row->correct_answer : null) : null,
                ];
            })->values();

        return response()->json([
            'quiz' => [
                'id' => (int) $quiz->id,
                'title' => (string) $quiz->title,
                'description' => $quiz->description ? (string) $quiz->description : null,
                'due_date' => $quiz->due_date ? (string) $quiz->due_date : null,
                'is_active' => (bool) $quiz->is_active,
                'questions' => $questions,
            ],
        ]);
    }

    public function createQuiz(Request $request)
    {
        if (!Schema::hasTable('neuronetix_quizzes')) {
            return response()->json(['message' => 'Tabela quizow nie istnieje jeszcze w bazie.'], 422);
        }

        $user = $request->user();
        if (!$user) {
            return response()->json(['message' => 'Brak autoryzacji.'], 401);
        }

        $role = strtolower(trim((string) ($user->rola ?? '')));
        if (!in_array($role, ['nauczyciel', 'admin', 'owner', 'teacher'], true)) {
            return response()->json(['message' => 'Brak uprawnien do tworzenia quizow.'], 403);
        }

        $data = $request->validate([
            'title' => ['required', 'string', 'max:180'],
            'description' => ['nullable', 'string', 'max:5000'],
            'due_date' => ['nullable', 'date'],
            'is_active' => ['nullable', 'boolean'],
            'student_user_ids' => ['nullable', 'array'],
            'student_user_ids.*' => ['integer', 'min:1'],
            'questions' => ['required', 'array', 'min:1'],
            'questions.*.question_text' => ['required', 'string', 'max:4000'],
            'questions.*.question_type' => ['nullable', 'string', 'max:24'],
            'questions.*.options' => ['nullable', 'array'],
            'questions.*.options.*' => ['string', 'max:500'],
            'questions.*.correct_answer' => ['nullable', 'string', 'max:2000'],
            'questions.*.points' => ['nullable', 'integer', 'min:1', 'max:100'],
        ]);

        $studentIds = collect($data['student_user_ids'] ?? [])
            ->map(static fn ($id): int => (int) $id)
            ->filter(static fn (int $id): bool => $id > 0)
            ->unique()
            ->values()
            ->all();

        foreach ($studentIds as $studentId) {
            if (!$this->canAssignStudent((int) $user->id, $studentId, (string) ($user->rola ?? ''))) {
                return response()->json(['message' => 'Brak uprawnien do przypisania quizu dla wybranego ucznia.'], 403);
            }
        }

        $quizId = null;
        $now = now();

        DB::transaction(function () use (&$quizId, $data, $studentIds, $user, $now) {
            $quizId = DB::table('neuronetix_quizzes')->insertGetId([
                'created_by_user_id' => (int) $user->id,
                'title' => trim((string) $data['title']),
                'description' => trim((string) ($data['description'] ?? '')) ?: null,
                'due_date' => $data['due_date'] ?? null,
                'is_active' => (bool) ($data['is_active'] ?? true),
                'created_at' => $now,
                'updated_at' => $now,
            ]);

            foreach ($data['questions'] as $index => $question) {
                $type = strtolower(trim((string) ($question['question_type'] ?? 'text')));
                if (!in_array($type, ['text', 'single_choice', 'open_with_whiteboard'], true)) {
                    $type = 'text';
                }

                $options = null;
                if ($type === 'single_choice') {
                    $rawOptions = is_array($question['options'] ?? null) ? $question['options'] : [];
                    $cleanOptions = array_values(array_filter(array_map(
                        static fn ($item): string => trim((string) $item),
                        $rawOptions
                    ), static fn (string $item): bool => $item !== ''));
                    $options = !empty($cleanOptions) ? json_encode($cleanOptions, JSON_UNESCAPED_UNICODE) : null;
                }

                DB::table('neuronetix_quiz_questions')->insert([
                    'quiz_id' => (int) $quizId,
                    'position' => $index + 1,
                    'question_text' => trim((string) $question['question_text']),
                    'question_type' => $type,
                    'options_json' => $options,
                    'correct_answer' => trim((string) ($question['correct_answer'] ?? '')) ?: null,
                    'points' => (int) ($question['points'] ?? 1),
                    'created_at' => $now,
                    'updated_at' => $now,
                ]);
            }

            foreach ($studentIds as $studentId) {
                DB::table('neuronetix_quiz_assignments')->insert([
                    'quiz_id' => (int) $quizId,
                    'student_user_id' => (int) $studentId,
                    'attempt_count' => 0,
                    'status' => 'assigned',
                    'created_at' => $now,
                    'updated_at' => $now,
                ]);

                $this->createNotification(
                    toUserId: (int) $studentId,
                    fromUserId: (int) $user->id,
                    type: 'quiz_assigned',
                    title: 'Nowy quiz',
                    message: 'Nauczyciel przypisal Ci nowy test/quiz.',
                    quizId: (int) $quizId
                );
            }
        });

        return response()->json(['ok' => true, 'quiz_id' => (int) $quizId], 201);
    }

    public function deleteQuiz(Request $request, int $quizId)
    {
        if (!Schema::hasTable('neuronetix_quizzes')) {
            return response()->json(['message' => 'Tabela quizow nie istnieje jeszcze w bazie.'], 422);
        }

        $user = $request->user();
        if (!$user) {
            return response()->json(['message' => 'Brak autoryzacji.'], 401);
        }

        $quiz = DB::table('neuronetix_quizzes')->where('id', $quizId)->first();
        if (!$quiz) {
            return response()->json(['message' => 'Quiz nie zostal znaleziony.'], 404);
        }

        $role = strtolower(trim((string) ($user->rola ?? '')));
        $isOwnerOrAdmin = in_array($role, ['owner', 'admin'], true);
        if (!$isOwnerOrAdmin && (int) $quiz->created_by_user_id !== (int) $user->id) {
            return response()->json(['message' => 'Brak uprawnien do usuniecia tego quizu.'], 403);
        }

        DB::transaction(function () use ($quizId) {
            DB::table('neuronetix_quiz_assignments')->where('quiz_id', $quizId)->delete();
            DB::table('neuronetix_quiz_questions')->where('quiz_id', $quizId)->delete();
            if (Schema::hasTable('neuronetix_quiz_whiteboard_notes')) {
                DB::table('neuronetix_quiz_whiteboard_notes')->where('quiz_id', $quizId)->delete();
            }
            if (Schema::hasTable('neuronetix_teacher_notifications')) {
                DB::table('neuronetix_teacher_notifications')->where('quiz_id', $quizId)->delete();
            }
            DB::table('neuronetix_quizzes')->where('id', $quizId)->delete();
        });

        return response()->json(['ok' => true]);
    }

    public function submitQuiz(Request $request, int $quizId)
    {
        if (!Schema::hasTable('neuronetix_quizzes') || !Schema::hasTable('neuronetix_quiz_assignments')) {
            return response()->json(['message' => 'Quizy nie sa jeszcze skonfigurowane w bazie.'], 422);
        }

        $user = $request->user();
        if (!$user) {
            return response()->json(['message' => 'Brak autoryzacji.'], 401);
        }

        $assignment = DB::table('neuronetix_quiz_assignments')
            ->where('quiz_id', $quizId)
            ->where('student_user_id', (int) $user->id)
            ->first();

        if (!$assignment) {
            return response()->json(['message' => 'Quiz nie jest przypisany do tego ucznia.'], 403);
        }

        $data = $request->validate([
            'answers' => ['required', 'array'],
        ]);

        $questions = DB::table('neuronetix_quiz_questions')
            ->where('quiz_id', $quizId)
            ->orderBy('position')
            ->get(['id', 'question_type', 'correct_answer', 'points']);

        $score = 0;
        $maxScore = 0;
        foreach ($questions as $question) {
            $questionId = (string) $question->id;
            $maxScore += (int) $question->points;

            $correct = strtolower(trim((string) ($question->correct_answer ?? '')));
            if ($correct === '') {
                continue;
            }

            $answer = strtolower(trim((string) ($data['answers'][$questionId] ?? '')));
            if ($answer !== '' && $answer === $correct) {
                $score += (int) $question->points;
            }
        }

        $answersJson = json_encode($data['answers'], JSON_UNESCAPED_UNICODE);
        DB::table('neuronetix_quiz_assignments')
            ->where('id', (int) $assignment->id)
            ->update([
                'attempt_count' => (int) $assignment->attempt_count + 1,
                'score' => $score,
                'max_score' => $maxScore,
                'status' => 'submitted',
                'answers_json' => $answersJson,
                'submitted_at' => now(),
                'updated_at' => now(),
            ]);

        $quiz = DB::table('neuronetix_quizzes')->where('id', $quizId)->first();
        if ($quiz) {
            $this->createNotification(
                toUserId: (int) $quiz->created_by_user_id,
                fromUserId: (int) $user->id,
                type: 'quiz_submitted',
                title: 'Uczen wyslal quiz',
                message: 'Uczen zakonczyl i wyslal odpowiedzi do quizu.',
                quizId: $quizId
            );
        }

        return response()->json([
            'ok' => true,
            'score' => $score,
            'max_score' => $maxScore,
        ]);
    }

    public function quizWhiteboardNotes(Request $request, int $quizId)
    {
        if (!Schema::hasTable('neuronetix_quiz_whiteboard_notes')) {
            return response()->json(['data' => []]);
        }

        $user = $request->user();
        if (!$user) {
            return response()->json(['message' => 'Brak autoryzacji.'], 401);
        }

        $data = $request->validate([
            'question_id' => ['nullable', 'integer', 'min:1'],
        ]);

        $query = DB::table('neuronetix_quiz_whiteboard_notes')
            ->where('quiz_id', $quizId)
            ->orderBy('id');

        if (!empty($data['question_id'])) {
            $query->where('question_id', (int) $data['question_id']);
        }

        $rows = $query->get([
            'id',
            'quiz_id',
            'question_id',
            'user_id',
            'note_text',
            'pos_x',
            'pos_y',
            'color',
            'created_at',
            'updated_at',
        ]);

        return response()->json([
            'data' => $rows->map(function (object $row) {
                return [
                    'id' => (int) $row->id,
                    'quiz_id' => (int) $row->quiz_id,
                    'question_id' => $row->question_id ? (int) $row->question_id : null,
                    'user_id' => (int) $row->user_id,
                    'text' => $row->note_text ? (string) $row->note_text : null,
                    'pos_x' => (int) $row->pos_x,
                    'pos_y' => (int) $row->pos_y,
                    'color' => (string) $row->color,
                    'updated_at' => (string) $row->updated_at,
                ];
            })->values(),
        ]);
    }

    public function saveQuizWhiteboardNote(Request $request, int $quizId)
    {
        if (!Schema::hasTable('neuronetix_quiz_whiteboard_notes')) {
            return response()->json(['message' => 'Tabela whiteboard nie istnieje jeszcze w bazie.'], 422);
        }

        $user = $request->user();
        if (!$user) {
            return response()->json(['message' => 'Brak autoryzacji.'], 401);
        }

        $data = $request->validate([
            'id' => ['nullable', 'integer', 'min:1'],
            'question_id' => ['nullable', 'integer', 'min:1'],
            'text' => ['nullable', 'string', 'max:6000'],
            'pos_x' => ['nullable', 'integer'],
            'pos_y' => ['nullable', 'integer'],
            'color' => ['nullable', 'string', 'max:30'],
        ]);

        $payload = [
            'quiz_id' => $quizId,
            'question_id' => $data['question_id'] ?? null,
            'user_id' => (int) $user->id,
            'note_text' => trim((string) ($data['text'] ?? '')) ?: null,
            'pos_x' => (int) ($data['pos_x'] ?? 80),
            'pos_y' => (int) ($data['pos_y'] ?? 80),
            'color' => trim((string) ($data['color'] ?? '#fff59d')) ?: '#fff59d',
            'updated_at' => now(),
        ];

        if (!empty($data['id'])) {
            $updated = DB::table('neuronetix_quiz_whiteboard_notes')
                ->where('id', (int) $data['id'])
                ->where('user_id', (int) $user->id)
                ->where('quiz_id', $quizId)
                ->update($payload);

            if ($updated) {
                return response()->json(['ok' => true, 'id' => (int) $data['id']]);
            }
        }

        $payload['created_at'] = now();
        $id = DB::table('neuronetix_quiz_whiteboard_notes')->insertGetId($payload);

        return response()->json(['ok' => true, 'id' => (int) $id], 201);
    }

    public function deleteQuizWhiteboardNote(Request $request, int $quizId, int $noteId)
    {
        if (!Schema::hasTable('neuronetix_quiz_whiteboard_notes')) {
            return response()->json(['ok' => true]);
        }

        $user = $request->user();
        if (!$user) {
            return response()->json(['message' => 'Brak autoryzacji.'], 401);
        }

        DB::table('neuronetix_quiz_whiteboard_notes')
            ->where('id', $noteId)
            ->where('quiz_id', $quizId)
            ->where('user_id', (int) $user->id)
            ->delete();

        return response()->json(['ok' => true]);
    }

    private function serializeTaskRow(object $row): array
    {
        return [
            'id' => (int) $row->id,
            'created_by_user_id' => (int) $row->created_by_user_id,
            'assigned_to_user_id' => (int) $row->assigned_to_user_id,
            'title' => (string) $row->title,
            'description' => $row->description ? (string) $row->description : null,
            'due_date' => $row->due_date ? (string) $row->due_date : null,
            'status' => $this->normalizeTaskStatus((string) $row->status),
            'has_whiteboard' => !empty($row->has_whiteboard),
            'created_at' => (string) $row->created_at,
            'updated_at' => (string) $row->updated_at,
            'creator' => [
                'imie' => $row->creator_imie ? (string) $row->creator_imie : null,
                'nick' => $row->creator_nick ? (string) $row->creator_nick : null,
                'email' => $row->creator_email ? (string) $row->creator_email : null,
            ],
            'assignee' => [
                'imie' => $row->assignee_imie ? (string) $row->assignee_imie : null,
                'nick' => $row->assignee_nick ? (string) $row->assignee_nick : null,
                'email' => $row->assignee_email ? (string) $row->assignee_email : null,
            ],
        ];
    }

    private function normalizeTaskStatus(string $status): string
    {
        $normalized = strtolower(trim($status));

        if (in_array($normalized, self::TASK_STATUSES, true)) {
            return $normalized;
        }

        if ($normalized === 'in_progress') {
            return 'workflow';
        }

        if ($normalized === 'done') {
            return 'submitted';
        }

        if ($normalized === 'cancelled') {
            return 'todo';
        }

        return 'todo';
    }

    private function taskStatusQueryCandidates(string $status): array
    {
        $normalized = $this->normalizeTaskStatus($status);

        if ($normalized === 'workflow') {
            return ['workflow', 'in_progress'];
        }

        if ($normalized === 'submitted') {
            return ['submitted', 'done'];
        }

        if ($normalized === 'todo') {
            return ['todo', 'cancelled'];
        }

        return [$normalized];
    }

    private function canManageTask(int $actorId, string $actorRole, int $creatorId): bool
    {
        $role = strtolower(trim($actorRole));
        if (in_array($role, ['owner', 'admin'], true)) {
            return true;
        }

        return $actorId === $creatorId;
    }

    private function canAssignStudent(int $teacherId, int $studentId, string $actorRole): bool
    {
        $role = strtolower(trim($actorRole));
        if (in_array($role, ['owner', 'admin'], true)) {
            return true;
        }

        if (!Schema::hasTable('neuronetix_user_relations')) {
            return false;
        }

        return DB::table('neuronetix_user_relations')
            ->where('supervisor_user_id', $teacherId)
            ->where('subordinate_user_id', $studentId)
            ->exists();
    }

    private function createNotification(
        int $toUserId,
        int $fromUserId,
        string $type,
        string $title,
        ?string $message = null,
        ?int $taskId = null,
        ?int $quizId = null,
    ): void {
        if (!Schema::hasTable('neuronetix_teacher_notifications')) {
            return;
        }

        DB::table('neuronetix_teacher_notifications')->insert([
            'to_user_id' => $toUserId,
            'from_user_id' => $fromUserId,
            'task_id' => $taskId,
            'quiz_id' => $quizId,
            'type' => $type,
            'title' => $title,
            'message' => $message,
            'created_at' => now(),
        ]);
    }
}
