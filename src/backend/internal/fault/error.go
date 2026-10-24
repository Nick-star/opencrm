package fault

import "fmt"

type Error struct {
	Code    string
	Message string
	Fields  map[string]string
}

func (e *Error) Error() string { return e.Message }
func Invalid(field, message string) error {
	return &Error{"validation", message, map[string]string{field: message}}
}
func NotFound(entity string) error {
	return &Error{"not_found", fmt.Sprintf("%s not found", entity), nil}
}
func Conflict(message string) error { return &Error{"conflict", message, nil} }
