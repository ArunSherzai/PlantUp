@echo off
maestro test ^
  -e TEST_EMAIL="test@example.com" ^
  -e TEST_PASSWORD="Password123" ^
  -e SEARCH_USERNAME="UserToSearch" ^
  maestro/
