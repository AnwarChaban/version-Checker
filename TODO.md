# TODO – Aufräumen & Datenmodell

## Ziel
Das System läuft aktuell, aber das Datenmodell ist semantisch inkonsistent:
- Echte NinjaOne-Daten werden in `mock_customers` und `mock_devices` gespeichert.
- Dadurch sind Code, API-Namen und Admin-UI missverständlich.

## Priorität 1 – Datenmodell korrigieren
- [ ] Neue Tabellen anlegen: `customers` und `devices` (statt `mock_*`)
- [ ] `devices.customer_id` als Foreign Key auf `customers.id`
- [ ] Optionales Feld `source` ergänzen (`ninjaone` | `manual`) für klare Herkunft
- [ ] Migrationsskript schreiben: Daten aus `mock_*` nach neuen Tabellen übertragen
- [ ] Fallback/Backwards-Compatibility definieren (ein Release lang beide lesen oder harter Cut)

## Priorität 2 – Backend-Namen bereinigen
- [ ] Service-Funktionen umbenennen (`getMockData` → `getStoredCustomers`)
- [ ] SQL-Queries auf neue Tabellen umstellen
- [ ] Log-Meldungen bereinigen (kein „mock“, wenn echte Daten gemeint sind)
- [ ] API-Antworten prüfen, damit Feldnamen fachlich korrekt bleiben

## Priorität 3 – Admin-Portal klarer machen
- [ ] In Admin-Endpoints Bezeichnungen von „Mock Customers/Devices“ auf „Customers/Devices“ ändern
- [ ] UI-Labels und Texte anpassen (kein „Mock“-Wording)
- [ ] Optional: Herkunft in UI anzeigen (`source`)

## Priorität 4 – NinjaOne-Sync robuster machen
- [ ] Upsert-Strategie statt kompletter Full-Replace-Löschung prüfen
- [ ] Nicht mehr vorhandene Geräte sauber als entfernt markieren oder löschen
- [ ] Fehlerfälle dokumentieren (API down → letzte gespeicherte Daten)
- [ ] Sync-Zeitpunkt speichern (`last_synced_at`)

## Priorität 5 – Sicherheit & Betrieb
- [ ] Secrets aus `.env.example` entfernen (nur Platzhalter lassen)
- [ ] Startup-Check für erforderliche Env-Variablen ergänzen
- [ ] Token-Handling zentral dokumentieren

## Priorität 6 – Tests
- [ ] Test für Migration `mock_*` → neue Tabellen
- [ ] Test für `/api/products` mit gespeicherten Daten ohne Absturz
- [ ] Test für Fallback-Verhalten bei NinjaOne-Fehler
- [ ] Test für Admin-CRUD auf neuen Tabellen

## Definition of Done
- [ ] Keine produktiven Pfade verwenden mehr `mock_*`-Tabellen oder „mock“-Wording
- [ ] Admin-Portal zeigt gespeicherte reale Daten korrekt an
- [ ] Migration ist reproduzierbar und dokumentiert
- [ ] Build + relevante Tests laufen grün
