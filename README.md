ModelPrep — Webowy Edytor Modeli 3D i Slicer dla Zortrax M200 Plus

ModelPrep to w pełni profesjonalna, darmowa aplikacja internetowa działająca bezpośrednio w przeglądarce, zaprojektowana z myślą o przygotowywaniu modeli 3D do druku na drukarkach serii Zortrax M200 Plus.

🚀 Najważniejsze funkcje

Wszystko w przeglądarce (Client-Side): Brak potrzeby instalowania oprogramowania na serwerze, brak backendu w Node.js/PHP. Pliki są przetwarzane lokalnie z użyciem WebGL i Three.js.

Obsługa formatów: Import plików STL (Binary & ASCII), OBJ oraz 3MF.

Zaawansowany system transformacji: Pełne wsparcie dla TransformControls (przesuwanie, obracanie, skalowanie), dokładne wpisywanie wartości, odbicia lustrzane, automatyczne pozycjonowanie na stole i centrowanie.

Weryfikacja pola roboczego Zortrax M200 Plus: Dokładne wymiary stołu (200 x 200 x 180 mm), automatyczne ostrzeżenia o wystawaniu modelu poza stół lub kolizji z podłożem.

Rzeczywisty Slicer w JavaScript: Algorytm przecinający geometrię trójkątów na warstwy, generujący obrysy, wypełnienia (grid, lines), tratwę (Raft) oraz podpory.

Interaktywny podgląd warstw: Suwak warstw, animacja odtwarzania ścieżek, podział na kolory (obrysy, wypełnienie, raft) oraz kalkulacja czasu druku i zużycia filamentu.

Eksport i kompatybilność: Eksport STL, OBJ, kompletnego pliku G-code oraz czytelne wyjaśnienie specyfiki formatu .zcodex.

Trwałość sesji: Automatyczny zapis stanu projektu w pamięci IndexedDB przeglądarki.

🛠️ Uruchomienie na GitHub Pages

Projekt jest gotowy do natychmiastowego wdrożenia statycznego na GitHub Pages:

Umieść wszystkie pliki w jednym repozytorium GitHub:

index.html

style.css

app.js

viewer.js

importer.js

slicer.js

exporter.js

profiles.js

README.md

W ustawieniach repozytorium (Settings -> Pages) przejdź do sekcji Build and deployment.

Jako Source wybierz gałąź (np. main lub master) oraz folder / (root).

Po chwili aplikacja będzie dostępna pod adresem https://TwojaNazwaUzytkownika.github.io/NazwaRepozytorium/.

⌨️ Skróty klawiszowe

G — Narzędzie przesuwania (Translate)

R — Narzędzie obracania (Rotate)

S — Narzędzie skalowania (Scale)

F — Dopasowanie kamery do zaznaczonego obiektu (Fit)

Delete — Usunięcie zaznaczonego obiektu ze stołu

Ctrl + Z / Ctrl + Y — Cofanie / Ponawianie operacji
