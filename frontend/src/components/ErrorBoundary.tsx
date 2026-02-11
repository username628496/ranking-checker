import React, { Component, ErrorInfo, ReactNode } from "react";
import { Alert, Button, Stack, Text, Box, Code } from "@mantine/core";
import { AlertTriangle, RefreshCw, Home } from "lucide-react";

interface ErrorBoundaryProps {
  children: ReactNode;
  fallbackTitle?: string;
  onReset?: () => void;
}

interface ErrorBoundaryState {
  hasError: boolean;
  error: Error | null;
  errorInfo: ErrorInfo | null;
}

/**
 * ErrorBoundary component to catch React errors and display a fallback UI
 *
 * Usage:
 * <ErrorBoundary fallbackTitle="Page Error">
 *   <YourComponent />
 * </ErrorBoundary>
 */
export class ErrorBoundary extends Component<ErrorBoundaryProps, ErrorBoundaryState> {
  constructor(props: ErrorBoundaryProps) {
    super(props);
    this.state = {
      hasError: false,
      error: null,
      errorInfo: null,
    };
  }

  static getDerivedStateFromError(error: Error): Partial<ErrorBoundaryState> {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, errorInfo: ErrorInfo): void {
    // Log error to console for debugging
    console.error("ErrorBoundary caught an error:", error, errorInfo);

    this.setState({
      error,
      errorInfo,
    });

    // You can also log to an error reporting service here
    // Example: Sentry.captureException(error, { extra: errorInfo });
  }

  handleReset = (): void => {
    this.setState({
      hasError: false,
      error: null,
      errorInfo: null,
    });

    if (this.props.onReset) {
      this.props.onReset();
    }
  };

  handleGoHome = (): void => {
    window.location.href = "/";
  };

  render(): ReactNode {
    if (this.state.hasError) {
      const { fallbackTitle = "Something went wrong" } = this.props;
      const isDevelopment = import.meta.env.DEV;

      return (
        <Box p="md">
          <Stack gap="md" maw={800} mx="auto">
            <Alert
              color="red"
              icon={<AlertTriangle size={20} />}
              title={fallbackTitle}
            >
              <Text size="sm" mb="md">
                An unexpected error occurred. Please try refreshing the page or return to the home page.
              </Text>

              <Stack gap="xs">
                <Button
                  onClick={this.handleReset}
                  leftSection={<RefreshCw size={16} />}
                  size="sm"
                  variant="light"
                >
                  Try Again
                </Button>

                <Button
                  onClick={this.handleGoHome}
                  leftSection={<Home size={16} />}
                  size="sm"
                  variant="outline"
                >
                  Go to Home
                </Button>
              </Stack>
            </Alert>

            {/* Show error details in development mode */}
            {isDevelopment && this.state.error && (
              <Alert color="gray" title="Error Details (Development Only)">
                <Stack gap="md">
                  <Box>
                    <Text size="xs" fw={600} mb={4}>
                      Error Message:
                    </Text>
                    <Code block>{this.state.error.toString()}</Code>
                  </Box>

                  {this.state.error.stack && (
                    <Box>
                      <Text size="xs" fw={600} mb={4}>
                        Stack Trace:
                      </Text>
                      <Code block style={{ maxHeight: 300, overflow: "auto" }}>
                        {this.state.error.stack}
                      </Code>
                    </Box>
                  )}

                  {this.state.errorInfo && (
                    <Box>
                      <Text size="xs" fw={600} mb={4}>
                        Component Stack:
                      </Text>
                      <Code block style={{ maxHeight: 200, overflow: "auto" }}>
                        {this.state.errorInfo.componentStack}
                      </Code>
                    </Box>
                  )}
                </Stack>
              </Alert>
            )}
          </Stack>
        </Box>
      );
    }

    return this.props.children;
  }
}

/**
 * Hook-based wrapper for ErrorBoundary (for convenience)
 */
export function withErrorBoundary<P extends object>(
  Component: React.ComponentType<P>,
  fallbackTitle?: string
): React.FC<P> {
  return function WithErrorBoundaryWrapper(props: P) {
    return (
      <ErrorBoundary fallbackTitle={fallbackTitle}>
        <Component {...props} />
      </ErrorBoundary>
    );
  };
}
