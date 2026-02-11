#!/bin/bash

# Install missing Radix UI packages for shadcn/ui components
npm install @radix-ui/react-dropdown-menu@^2.0.6 \
  @radix-ui/react-dialog@^1.0.5 \
  @radix-ui/react-toast@^1.1.5 \
  @radix-ui/react-tooltip@^1.0.7 \
  @radix-ui/react-progress@^1.0.3 \
  @radix-ui/react-separator@^1.0.3

echo "✅ Radix UI packages installed successfully!"
