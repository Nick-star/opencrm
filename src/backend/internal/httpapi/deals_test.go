package httpapi

import (
	"fmt"
	"testing"
)

func TestDealStagesAndAmounts(t *testing.T) {
	a := newAPI(t)
	customerID := a.customer()
	body := fmt.Sprintf(`{"customerId":%d,"title":"Website","amountMinor":123456,"description":"Design"}`, customerID)
	d := a.call("POST", "/deals", body, 201)
	key := int(d["id"].(float64))
	path := fmt.Sprintf("/deals/%d", key)
	if d["stage"] != "new" || d["amountMinor"] != float64(123456) {
		t.Fatalf("deal: %+v", d)
	}
	for _, stage := range []string{"negotiation", "proposal", "won"} {
		a.call("PATCH", path+"/stage", fmt.Sprintf(`{"stage":%q}`, stage), 200)
	}
	a.call("PATCH", path+"/stage", `{"stage":"new"}`, 409)
	reopened := a.call("POST", path+"/reopen", `{}`, 200)
	if reopened["stage"] != "new" {
		t.Fatal(reopened)
	}
	a.call("PATCH", path, `{"title":"Revised","amountMinor":0}`, 200)
	a.call("PATCH", path, `{"amountMinor":-1}`, 400)
	a.call("PATCH", path+"/stage", `{"stage":"unknown"}`, 400)
	a.call("POST", "/deals", `{"customerId":999,"title":"Missing","amountMinor":0}`, 404)
	list := a.call("GET", fmt.Sprintf("/deals?customerId=%d&stage=new", customerID), "", 200)
	if list["total"] != float64(1) {
		t.Fatal(list)
	}
}
