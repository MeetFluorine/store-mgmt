-- =========================================================
-- Seed data — mirrors js/mock/data.js so switching USE_MOCK_DATA
-- to false in js/config.js doesn't change what you see on screen.
-- =========================================================

insert into stores (store_code, store_name, address, latitude, longitude, allowed_radius, status) values
  ('SDFX_PIPARIYA_PPI', 'Pipariya Store', 'Pipariya, Madhya Pradesh', 22.7526, 77.4977, 100, 'active'),
  ('SDFX_INDORE_IND',   'Indore Store',   'Indore, Madhya Pradesh',   22.7196, 75.8577, 120, 'active'),
  ('SDFX_BHOPAL_BPL',   'Bhopal Store',   'Bhopal, Madhya Pradesh',   23.2599, 77.4126, 100, 'active'),
  ('SDFX_JABALPUR_JBP', 'Jabalpur Store', 'Jabalpur, Madhya Pradesh', 23.1815, 79.9864, 100, 'active'),
  ('SDFX_UDAIPUR_UDR',  'Udaipur Store',  'Udaipur, Rajasthan',       24.5854, 73.7125, 100, 'active')
on conflict (store_code) do nothing;

insert into employees (employee_code, name, mobile, designation, status) values
  ('EMP001', 'Rahul Sharma', '+91 98765 43210', 'Store Associate', 'active'),
  ('EMP014', 'Sneha Verma',  '+91 98765 00014', 'Store Associate', 'active'),
  ('EMP027', 'Amit Yadav',   '+91 98765 00027', 'Cashier',         'active'),
  ('EMP033', 'Pooja Singh',  '+91 98765 00033', 'Store Associate', 'active'),
  ('EMP041', 'Karan Mehta',  '+91 98765 00041', 'Store Associate', 'active'),
  ('EMP052', 'Neha Jadhav',  '+91 98765 00052', 'Cashier',         'inactive')
on conflict (employee_code) do nothing;

insert into employee_store_mapping (employee_id, store_id, effective_from, status)
select e.id, s.id, current_date, 'active'
from employees e
join stores s on
  (e.employee_code = 'EMP001' and s.store_code = 'SDFX_PIPARIYA_PPI') or
  (e.employee_code = 'EMP014' and s.store_code = 'SDFX_INDORE_IND') or
  (e.employee_code = 'EMP027' and s.store_code = 'SDFX_BHOPAL_BPL') or
  (e.employee_code = 'EMP033' and s.store_code = 'SDFX_JABALPUR_JBP') or
  (e.employee_code = 'EMP041' and s.store_code = 'SDFX_UDAIPUR_UDR') or
  (e.employee_code = 'EMP052' and s.store_code = 'SDFX_BHOPAL_BPL')
on conflict do nothing;
