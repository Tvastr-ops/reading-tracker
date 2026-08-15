cmake_minimum_required(VERSION 3.14)
project(reading_tracker_app LANGUAGES CXX)

set(BINARY_NAME "paperback_reader")

cmake_policy(SET CMP0063 NEW)

set(CMAKE_INSTALL_PREFIX "${CMAKE_BINARY_DIR}/plugins")

include(flutter/generated_plugins.cmake)

set(FLUTTER_MANAGED_DIR "${CMAKE_CURRENT_SOURCE_DIR}/flutter")

add_subdirectory(${FLUTTER_MANAGED_DIR} ${CMAKE_CURRENT_BINARY_DIR}/flutter)

add_subdirectory(runner)

list(APPEND FLUTTER_PLUGIN_LIST)

foreach(plugin ${FLUTTER_PLUGIN_LIST})
  add_subdirectory(flutter/ephemeral/.plugin_symlinks/${plugin}/windows plugins/${plugin})
endforeach()
