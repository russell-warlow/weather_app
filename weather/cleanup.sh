readonly USER=dbadmin
psql -U $USER -d app \
  -c "delete from weather_forecast where generated_at < now() - interval '1 week';"
  