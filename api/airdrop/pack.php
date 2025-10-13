<?php
header('Content-Type: application/json');
header('Referrer-Policy: no-referrer');
header('Cache-Control: no-store');

$EXPECTED_ID = '8kodc101HZYYeddf59887524792417xrgd';

if ($_SERVER['REQUEST_METHOD'] !== 'POST') {
  http_response_code(405);
  echo json_encode(['ok' => false, 'error' => 'method_not_allowed']);
  exit;
}
$serviceId = $_SERVER['HTTP_X_SERVICE_ID'] ?? '';
if ($serviceId !== $EXPECTED_ID) {
  http_response_code(401);
  echo json_encode(['ok' => false, 'error' => 'unauthorized']);
  exit;
}
$raw = file_get_contents('php://input');
$body = json_decode($raw, true);
if (!$body) { $body = []; }
file_put_contents(__DIR__.'/log.txt', date('c')." pack ".json_encode($body)."\n", FILE_APPEND);

echo json_encode(['ok' => true, 'received' => true]);
