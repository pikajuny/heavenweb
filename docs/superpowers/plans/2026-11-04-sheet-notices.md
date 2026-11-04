# Spreadsheet notices — 2026-11-04

Add a read-only notice board above lounge rankings. Authors edit the central spreadsheet [공지] sheet directly. Default proposed schema: 작성일, 제목, 내용, 공개. Only TRUE rows are published; preserve plain text/newlines, sort newest first. Missing sheet shows empty state; malformed headers return a useful error. No writes or automatic sheet creation on reads.

1. Add GAS read tests covering no sheet, hidden rows, empty title, reordered headers, date ordering, JSON dates and club-list exclusion.
2. Add notice read handler and SHEET.NOTICE; exclude it from getClubList.
3. Add responsive split view: left list with ten rows per page, right article; select latest by default. Refresh, selected indication and stacked mobile layout. Escape all sheet content, use textContent for article details; keep rankings independent of notice failures.
4. Run full tests, syntax/diff checks and document setup. Deployment requires push.gas plus updating the current Apps Script web-app version, followed by push.git. No deployment requested.
