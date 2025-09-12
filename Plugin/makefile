CXX      := g++
CXXFLAGS := -std=gnu++17 -O2 -Wall -DUNICODE -D_UNICODE -DWIN32_LEAN_AND_MEAN
LDFLAGS  := -shared -Wl,--subsystem,windows -static-libstdc++ -static-libgcc


SRC   := update_checker.cpp
DLL   := UpdateChecker.dll
LIBS  := -luser32 -lshell32 -lcomctl32 -lgdi32 -lole32 -luuid -lurlmon
AUI2 := UpdateChecker.aui2
# インストール先ディレクトリ
DEST_DIR := C:\\ProgramData\\aviutl2\\Plugin

all: $(AUI2) install

$(DLL): $(SRC) input2.h
	$(CXX) $(CXXFLAGS) $(LDFLAGS) -o $@ $(SRC) $(LIBS)

$(AUI2): $(DLL)
	cmd /c copy /Y $(DLL) $(AUI2) >nul

.PHONY: install
install: $(AUI2)
	cmd /c if not exist "$(DEST_DIR)" mkdir "$(DEST_DIR)"
	cmd /c copy /Y "$(AUI2)" "$(DEST_DIR)\\$(AUI2)" >nul

.PHONY: clean
clean:
	cmd /c del /Q $(DLL) $(AUI2) 2>nul || exit 0
