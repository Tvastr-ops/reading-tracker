#include "my_application.h"

#include <cstdlib>

int main(int argc, char** argv) {
  // Disable experimental Impeller on Linux desktop by default to avoid
  // glyph atlas corruption and shader glitches on Wayland, VMs, and Mesa drivers.
  if (getenv("FLUTTER_ENGINE_SWITCHES") == nullptr) {
    setenv("FLUTTER_ENGINE_SWITCHES", "1", 1);
    setenv("FLUTTER_ENGINE_SWITCH_1", "enable-impeller=false", 1);
  }

  g_autoptr(MyApplication) app = my_application_new();
  return g_application_run(G_APPLICATION(app), argc, argv);
}
