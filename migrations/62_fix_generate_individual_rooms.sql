CREATE OR REPLACE FUNCTION generate_individual_rooms(
  p_room_type_id UUID,
  p_prefix TEXT DEFAULT '',
  p_start_number INTEGER DEFAULT 1,
  p_count INTEGER DEFAULT 1,
  p_floor_number INTEGER DEFAULT NULL
) RETURNS TABLE(individual_room_id UUID, room_number TEXT) AS $$
DECLARE
  v_individual_room_id UUID;
  v_room_num TEXT;
  v_floor_num INTEGER;
  v_hotel_id UUID;
  i INTEGER;
  v_room_number TEXT;
  v_suffix INTEGER;
  v_base_number TEXT;
BEGIN
  SELECT hotel_id INTO v_hotel_id
  FROM rooms
  WHERE id = p_room_type_id;

  IF v_hotel_id IS NULL THEN
    RAISE EXCEPTION 'Room type % does not exist or has no associated hotel', p_room_type_id;
  END IF;

  v_floor_num := COALESCE(p_floor_number, (p_start_number / 100));

  FOR i IN 1..p_count LOOP
    IF (p_start_number + i - 1) < 10 THEN
      v_base_number := p_prefix || '0' || (p_start_number + i - 1)::TEXT;
    ELSE
      v_base_number := p_prefix || (p_start_number + i - 1)::TEXT;
    END IF;

    v_room_number := v_base_number;
    v_suffix := 0;

    WHILE EXISTS (
      SELECT 1 FROM individual_rooms ir
      WHERE ir.hotel_id = v_hotel_id
        AND ir.room_number = v_room_number
    ) LOOP
      v_suffix := v_suffix + 1;
      v_room_number := v_base_number || '-' || v_suffix::TEXT;
    END LOOP;

    INSERT INTO individual_rooms (
      room_id,
      hotel_id,
      room_number,
      floor_number,
      current_status
    )
    VALUES (
      p_room_type_id,
      v_hotel_id,
      v_room_number,
      v_floor_num,
      'clean'
    )
    RETURNING individual_rooms.id, individual_rooms.room_number INTO v_individual_room_id, v_room_num;

    individual_room_id := v_individual_room_id;
    room_number := v_room_num;
    RETURN NEXT;
  END LOOP;

  RETURN;
END;
$$ LANGUAGE plpgsql;






