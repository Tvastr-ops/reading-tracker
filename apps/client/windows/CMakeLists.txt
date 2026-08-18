cmake_minimum_required(VERSION 3.14)
project(reading_tracker_app LANGUAGES CXX)

set(BINARY_NAME "paperback_reader")

cmake_policy(SET CMP0063 NEW)

set(CMAKE_INSTALL_PREFIX "${CMAKE_BINARY_DIR}/plugins")

# Apply standard build settings for targets and plugins
if(NOT COMMAND apply_standard_settings)
  function(apply_standard_settings TARGET)
    target_compile_features(${TARGET} PUBLIC cxx_std_17)
    target_compile_options(${TARGET} PRIVATE /W4 /wd"4100")
    target_compile_options(${TARGET} PRIVATE "$<$<NOT:$<CONFIG:Debug>>:/O2>")
    target_compile_definitions(${TARGET} PRIVATE "$<$<NOT:$<CONFIG:Debug>>:NDEBUG>")
  endfunction()
endif()

set(FLUTTER_MANAGED_DIR "${CMAKE_CURRENT_SOURCE_DIR}/flutter")

add_subdirectory(${FLUTTER_MANAGED_DIR} flutter)

add_subdirectory(runner)

include(flutter/generated_plugins.cmake)
