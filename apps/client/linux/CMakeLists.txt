cmake_minimum_required(VERSION 3.10)
project(runner LANGUAGES CXX)

# Set the application target name. To change its name, change BINARY_NAME in the
# top-level CMakeLists.txt, not the value in runner/CMakeLists.txt, or `flutter run`
# will no longer work.
set(BINARY_NAME "paperback_reader")
# Set the application ID.
set(APPLICATION_ID "com.readingtracker.app")

# Explicitly opt in to modern CMake behaviors to avoid warnings with recent
# versions of CMake.
cmake_policy(SET CMP0063 NEW)
cmake_policy(SET CMP0079 NEW)

# Load bundled libraries from the lib/ directory relative to the binary.
set(CMAKE_INSTALL_RPATH "$ORIGIN/lib")

# Root directory of the Flutter project.
set(FLUTTER_PROJECT_DIR "${CMAKE_CURRENT_SOURCE_DIR}/..")

# Directory where Flutter will output ephemeral build artifacts.
set(FLUTTER_MANAGED_DIR "${CMAKE_CURRENT_SOURCE_DIR}/flutter")

# System-level dependencies.
find_package(PkgConfig REQUIRED)
pkg_check_modules(GTK REQUIRED IMPORTED_TARGET gtk+-3.0)
pkg_check_modules(GLIB REQUIRED IMPORTED_TARGET glib-2.0)
pkg_check_modules(GIO REQUIRED IMPORTED_TARGET gio-2.0)

# Apply standard build settings for targets and plugins
if(NOT COMMAND apply_standard_settings)
  function(apply_standard_settings TARGET)
    target_compile_features(${TARGET} PUBLIC cxx_std_14)
    target_compile_options(${TARGET} PRIVATE -Wall -Werror)
    target_compile_options(${TARGET} PRIVATE "$<$<NOT:$<CONFIG:Debug>>:-O3>")
    target_compile_definitions(${TARGET} PRIVATE "$<$<NOT:$<CONFIG:Debug>>:NDEBUG>")
  endfunction()
endif()

# Configuration provided by the Flutter toolchain.
include(${FLUTTER_MANAGED_DIR}/ephemeral/generated_config.cmake OPTIONAL)

# Flutter-generated code, which must come before the application code.
add_subdirectory(${FLUTTER_MANAGED_DIR} flutter)

# The application code.
add_subdirectory(runner)

# The plugin-generated code.
include(${FLUTTER_MANAGED_DIR}/generated_plugins.cmake)
