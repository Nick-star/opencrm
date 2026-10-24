package httpapi

import (
	"fmt"
	"testing"
)

func TestArchiveGuardsAndDashboard(t *testing.T) {
	a := newAPI(t)
	c := a.customer()
	cp := fmt.Sprintf("/customers/%d", c)
	d := a.call("POST", "/deals", fmt.Sprintf(`{"customerId":%d,"title":"Project","amountMinor":123456}`, c), 201)
	dp := fmt.Sprintf("/deals/%d", int(d["id"].(float64)))
	a.call("PATCH", cp+"/archive", `{"archived":true}`, 409)
	task := a.call("POST", "/tasks", fmt.Sprintf(`{"customerId":%d,"title":"Follow up","dueAt":"2020-01-01T00:00:00Z"}`, c), 201)
	tp := fmt.Sprintf("/tasks/%d", int(task["id"].(float64)))
	a.call("PATCH", dp+"/stage", `{"stage":"won"}`, 200)
	a.call("PATCH", cp+"/archive", `{"archived":true}`, 409)
	summary := a.call("GET", "/dashboard?timeZone=Asia%2FKrasnoyarsk", "", 200)
	if summary["activeCustomers"] != float64(1) || summary["wonAmountMinor"] != float64(123456) || summary["wonDeals"] != float64(1) || summary["openDeals"] != float64(0) {
		t.Fatalf("dashboard: %+v", summary)
	}
	a.call("PATCH", tp+"/completion", `{"completed":true}`, 200)
	a.call("PATCH", cp+"/archive", `{"archived":true}`, 200)
	if list := a.call("GET", "/customers", "", 200); list["total"] != float64(0) {
		t.Fatal(list)
	}
	a.call("POST", "/deals", fmt.Sprintf(`{"customerId":%d,"title":"Blocked","amountMinor":1}`, c), 409)
	a.call("POST", "/tasks", fmt.Sprintf(`{"customerId":%d,"title":"Blocked","dueAt":"2026-01-01T00:00:00Z"}`, c), 409)
	a.call("POST", dp+"/reopen", `{}`, 409)
	a.call("PATCH", tp+"/completion", `{"completed":false}`, 409)
	a.call("PATCH", cp+"/archive", `{"archived":false}`, 200)
	a.call("GET", dp, "", 200)
	a.call("GET", tp, "", 200)
}
