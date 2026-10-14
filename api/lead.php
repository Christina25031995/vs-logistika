<?php
/* Заявка с формы сайта → сообщение Владиславу в Max (бот ВС-Логистики, platform-api2.max.ru).
   Токен бота лежит ВНЕ сайта: /www/vsl-max.php  →  <?php return ['token' => '...'];
   Получатель (user_id Владислава) сохраняется сам: Владислав жмёт «Начать» в боте, потом один раз
   открыть https://vs-evakuator.ru/api/lead.php?setup=1 — скрипт найдёт его в обновлениях бота и запишет /www/vsl-max-user.txt.
   Если Max не ответил, заявка пишется в /www/vsl-leads-failed.log (чтобы не потерялась), а форма просит позвонить. */
header('Content-Type: application/json; charset=utf-8');
header('Cache-Control: no-store');
$DIR  = dirname(__DIR__, 2);
$CFG  = $DIR . '/vsl-max.php';
$USER = $DIR . '/vsl-max-user.txt';
$FAIL = $DIR . '/vsl-leads-failed.log';

function out($a, $code = 200) { http_response_code($code); echo json_encode($a, JSON_UNESCAPED_UNICODE); exit; }
function api($method, $path, $token, $body = null) {
  $ch = curl_init('https://platform-api2.max.ru' . $path);
  curl_setopt_array($ch, [CURLOPT_RETURNTRANSFER => true, CURLOPT_TIMEOUT => 15, CURLOPT_CUSTOMREQUEST => $method,
    CURLOPT_HTTPHEADER => ['Authorization: ' . $token, 'Content-Type: application/json']]);
  if ($body !== null) curl_setopt($ch, CURLOPT_POSTFIELDS, json_encode($body, JSON_UNESCAPED_UNICODE));
  $r = curl_exec($ch); $code = curl_getinfo($ch, CURLINFO_HTTP_CODE); curl_close($ch);
  return [$code, json_decode((string)$r, true)];
}

$cfg = is_file($CFG) ? include $CFG : null;
$token = is_array($cfg) ? trim($cfg['token'] ?? '') : '';

/* Привязка получателя: один раз, пока файла с user_id нет */
if (isset($_GET['setup'])) {
  if (!$token) out(['ok' => false, 'error' => 'нет токена в /www/vsl-max.php']);
  if (is_file($USER)) out(['ok' => true, 'info' => 'получатель уже привязан']);
  [$c, $j] = api('GET', '/updates?limit=100&timeout=0', $token);
  $found = null;
  foreach (($j['updates'] ?? []) as $u) {
    $who = $u['user'] ?? ($u['message']['sender'] ?? null);
    if (!empty($who['user_id'])) $found = $who;
  }
  if (!$found) out(['ok' => false, 'error' => 'нет сообщений боту: Владиславу нажать «Начать» в боте и повторить', 'http' => $c]);
  file_put_contents($USER, (string)$found['user_id']);
  api('POST', '/messages?user_id=' . $found['user_id'], $token, ['text' => 'Готово: сюда будут приходить заявки с сайта vs-evakuator.ru']);
  out(['ok' => true, 'bound' => $found['name'] ?? 'пользователь']);
}

if ($_SERVER['REQUEST_METHOD'] !== 'POST') out(['ok' => false], 405);
$d = json_decode(file_get_contents('php://input'), true);
if (!is_array($d)) out(['ok' => false], 400);
$f = function ($k, $n = 300) use ($d) { return mb_substr(trim(preg_replace('/\s+/u', ' ', (string)($d[$k] ?? ''))), 0, $n); };
$phone = $f('phone', 40);
$digits = preg_replace('/\D/', '', $phone);
if (strlen($digits) < 10 || strlen($digits) > 11) out(['ok' => false, 'error' => 'phone'], 400);

/* не больше 5 заявок с одного IP за 10 минут */
$rl = sys_get_temp_dir() . '/vsl-rl-' . md5($_SERVER['REMOTE_ADDR'] ?? '');
$hits = array_filter(is_file($rl) ? (array)json_decode(file_get_contents($rl), true) : [], function ($t) { return $t > time() - 600; });
if (count($hits) >= 5) out(['ok' => false, 'error' => 'rate'], 429);
$hits[] = time(); file_put_contents($rl, json_encode(array_values($hits)));

date_default_timezone_set('Europe/Moscow');
$lines = ['Заявка с сайта vs-evakuator.ru', 'Телефон: ' . $phone];
foreach ([['from', 'Где машина'], ['to', 'Куда везти'], ['sit', 'Ситуация'], ['veh', 'Авто'], ['q1', 'Колёса крутятся'],
          ['q2', 'Руль или КПП заблокированы'], ['q3', 'Доп. вопрос'], ['tech', 'Подобрано'], ['price', 'Ориентир цены'],
          ['comment', 'Комментарий'], ['page', 'Страница']] as [$k, $label]) {
  $v = $f($k); if ($v !== '') $lines[] = $label . ': ' . $v;
}
$lines[] = date('d.m.Y H:i') . ' МСК';
$text = implode("\n", $lines);

$uid = is_file($USER) ? trim(file_get_contents($USER)) : '';
$ok = false;
if ($token && $uid) { [$c, $j] = api('POST', '/messages?user_id=' . rawurlencode($uid), $token, ['text' => $text]); $ok = $c >= 200 && $c < 300; }
if (!$ok) { file_put_contents($FAIL, $text . "\n----\n", FILE_APPEND | LOCK_EX); out(['ok' => false, 'error' => 'send'], 502); }
out(['ok' => true]);
