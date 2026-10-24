# OpenCRM

A single-owner workspace for customer relationships and sales.

## Language

**Customer**: A person whose contact details and relationship history the owner manages. A company is an optional attribute, not a separate customer type.
_Avoid_: Account, contact

**Deal**: A potential sale to one customer, with a title, amount in rubles and a stage.
_Avoid_: Order, payment

**Stage**: The position of a deal in the fixed pipeline: new, negotiation, proposal, won or lost. Won and lost are closed stages.

**Task**: A planned action for one customer with an exact due time; it may also relate to one of that customer's deals. A task is either open or completed.
_Avoid_: Reminder, notification

**Archived customer**: A customer retained for history who cannot receive new deals or tasks. A customer with open deals or tasks cannot be archived.
