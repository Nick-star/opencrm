package httpapi

import (
	"fmt"
	"testing"
	"time"
)

func TestTasksRelationshipsAndTime(t *testing.T) {
	a := newAPI(t)
	owner := a.customer()
	other := a.customer()
	d := a.call("POST", "/deals", fmt.Sprintf(`{"customerId":%d,"title":"Sale","amountMinor":10}`, owner), 201)
	dealID := int(d["id"].(float64))
	a.call("POST", "/tasks", fmt.Sprintf(`{"customerId":%d,"dealId":%d,"title":"Wrong owner","dueAt":"2026-01-01T10:00:00+07:00"}`, other, dealID), 400)
	task := a.call("POST", "/tasks", fmt.Sprintf(`{"customerId":%d,"dealId":%d,"title":"Call","dueAt":"2026-01-01T10:00:00+07:00"}`, owner, dealID), 201)
	if task["dueAt"] != "2026-01-01T03:00:00Z" {
		t.Fatalf("UTC: %+v", task)
	}
	path := fmt.Sprintf("/tasks/%d", int(task["id"].(float64)))
	a.call("PATCH", path, `{"title":"Follow up","dueAt":"2020-01-01T00:00:00Z"}`, 200)
	overdue := a.call("GET", "/tasks?filter=overdue&timeZone=Asia%2FKrasnoyarsk", "", 200)
	if overdue["total"] != float64(1) {
		t.Fatal(overdue)
	}
	a.call("PATCH", path+"/completion", `{"completed":true}`, 200)
	completed := a.call("GET", "/tasks?filter=completed", "", 200)
	if completed["total"] != float64(1) {
		t.Fatal(completed)
	}
	a.call("PATCH", path+"/completion", `{"completed":false}`, 200)
	a.call("PATCH", fmt.Sprintf("/deals/%d/stage", dealID), `{"stage":"won"}`, 200)
	got := a.call("GET", path, "", 200)
	if got["completed"] != false {
		t.Fatal("deal closure completed task")
	}
	a.call("PATCH", path, `{"dueAt":"invalid"}`, 400)
	a.call("GET", "/tasks?filter=today&timeZone=Invalid", "", 400)
	// A fixed instant falls on different calendar dates in the two zones.
	instant := time.Now().UTC()
	day := instant.Format("2006-01-02")
	hour := "23:30:00"
	if instant.Hour() >= 12 {
		hour = "00:30:00"
	}
	a.call("POST", "/tasks", fmt.Sprintf(`{"customerId":%d,"title":"Boundary","dueAt":"%sT%sZ"}`, owner, day, hour), 201)
	utc := a.call("GET", "/tasks?filter=today&timeZone=UTC", "", 200)
	shifted := a.call("GET", "/tasks?filter=today&timeZone=Etc%2FGMT-12", "", 200)
	if shifted["total"] != float64(0) {
		t.Fatalf("time zone boundary: %+v", shifted)
	}
	if utc["total"] != float64(1) {
		t.Fatalf("UTC calendar: %+v", utc)
	}
}
