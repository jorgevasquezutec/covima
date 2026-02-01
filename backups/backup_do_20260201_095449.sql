--
-- PostgreSQL database dump
--

\restrict gdOcSdMVouAQQS98Yaj9emmjXpx8glCeoVppZJ1JVlpRYWlvDHkqtFlMVUk9gIl

-- Dumped from database version 16.11 (Debian 16.11-1.pgdg12+1)
-- Dumped by pg_dump version 16.11 (Debian 16.11-1.pgdg12+1)

SET statement_timeout = 0;
SET lock_timeout = 0;
SET idle_in_transaction_session_timeout = 0;
SET client_encoding = 'UTF8';
SET standard_conforming_strings = on;
SELECT pg_catalog.set_config('search_path', '', false);
SET check_function_bodies = false;
SET xmloption = content;
SET client_min_messages = warning;
SET row_security = off;

--
-- Name: CategoriaAccion; Type: TYPE; Schema: public; Owner: postgres
--

CREATE TYPE public."CategoriaAccion" AS ENUM (
    'ASISTENCIA',
    'PARTICIPACION',
    'EVENTO_ESPECIAL',
    'LOGRO',
    'BONUS'
);


ALTER TYPE public."CategoriaAccion" OWNER TO postgres;

--
-- Name: CriterioMembresia; Type: TYPE; Schema: public; Owner: postgres
--

CREATE TYPE public."CriterioMembresia" AS ENUM (
    'MANUAL',
    'TODOS_ACTIVOS',
    'ROL_LIDER',
    'ROL_ADMIN',
    'ROL_LIDER_ADMIN'
);


ALTER TYPE public."CriterioMembresia" OWNER TO postgres;

--
-- Name: DireccionMensaje; Type: TYPE; Schema: public; Owner: postgres
--

CREATE TYPE public."DireccionMensaje" AS ENUM (
    'ENTRANTE',
    'SALIENTE'
);


ALTER TYPE public."DireccionMensaje" OWNER TO postgres;

--
-- Name: EstadoMensaje; Type: TYPE; Schema: public; Owner: postgres
--

CREATE TYPE public."EstadoMensaje" AS ENUM (
    'PENDIENTE',
    'ENVIADO',
    'ENTREGADO',
    'LEIDO',
    'FALLIDO'
);


ALTER TYPE public."EstadoMensaje" OWNER TO postgres;

--
-- Name: EstadoRanking; Type: TYPE; Schema: public; Owner: postgres
--

CREATE TYPE public."EstadoRanking" AS ENUM (
    'ACTIVO',
    'CERRADO',
    'PAUSADO'
);


ALTER TYPE public."EstadoRanking" OWNER TO postgres;

--
-- Name: ModoConversacion; Type: TYPE; Schema: public; Owner: postgres
--

CREATE TYPE public."ModoConversacion" AS ENUM (
    'BOT',
    'HANDOFF',
    'PAUSADO'
);


ALTER TYPE public."ModoConversacion" OWNER TO postgres;

--
-- Name: ModoRespuestaHandoff; Type: TYPE; Schema: public; Owner: postgres
--

CREATE TYPE public."ModoRespuestaHandoff" AS ENUM (
    'WEB',
    'WHATSAPP',
    'AMBOS'
);


ALTER TYPE public."ModoRespuestaHandoff" OWNER TO postgres;

--
-- Name: TipoGrupoRanking; Type: TYPE; Schema: public; Owner: postgres
--

CREATE TYPE public."TipoGrupoRanking" AS ENUM (
    'SISTEMA',
    'PERSONALIZADO'
);


ALTER TYPE public."TipoGrupoRanking" OWNER TO postgres;

SET default_tablespace = '';

SET default_table_access_method = heap;

--
-- Name: _prisma_migrations; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public._prisma_migrations (
    id character varying(36) NOT NULL,
    checksum character varying(64) NOT NULL,
    finished_at timestamp with time zone,
    migration_name character varying(255) NOT NULL,
    logs text,
    rolled_back_at timestamp with time zone,
    started_at timestamp with time zone DEFAULT now() NOT NULL,
    applied_steps_count integer DEFAULT 0 NOT NULL
);


ALTER TABLE public._prisma_migrations OWNER TO postgres;

--
-- Name: asistencias; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.asistencias (
    id integer NOT NULL,
    usuario_id integer,
    fecha date NOT NULL,
    semana_inicio date NOT NULL,
    metodo_registro character varying(20) NOT NULL,
    estado character varying(30) DEFAULT 'pendiente_confirmacion'::character varying NOT NULL,
    confirmado_por integer,
    confirmado_at timestamp(3) without time zone,
    notas_confirmacion text,
    qr_id integer,
    created_at timestamp(3) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    datos_formulario jsonb,
    nombre_registro character varying(100),
    telefono_registro character varying(25),
    tipo_id integer
);


ALTER TABLE public.asistencias OWNER TO postgres;

--
-- Name: asistencias_id_seq; Type: SEQUENCE; Schema: public; Owner: postgres
--

CREATE SEQUENCE public.asistencias_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE public.asistencias_id_seq OWNER TO postgres;

--
-- Name: asistencias_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: postgres
--

ALTER SEQUENCE public.asistencias_id_seq OWNED BY public.asistencias.id;


--
-- Name: audit_log; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.audit_log (
    id integer NOT NULL,
    usuario_id integer,
    accion character varying(100) NOT NULL,
    tabla_afectada character varying(50),
    registro_id integer,
    datos_anteriores jsonb,
    datos_nuevos jsonb,
    created_at timestamp(3) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL
);


ALTER TABLE public.audit_log OWNER TO postgres;

--
-- Name: audit_log_id_seq; Type: SEQUENCE; Schema: public; Owner: postgres
--

CREATE SEQUENCE public.audit_log_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE public.audit_log_id_seq OWNER TO postgres;

--
-- Name: audit_log_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: postgres
--

ALTER SEQUENCE public.audit_log_id_seq OWNED BY public.audit_log.id;


--
-- Name: configuracion_puntaje; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.configuracion_puntaje (
    id integer NOT NULL,
    codigo character varying(50) NOT NULL,
    categoria public."CategoriaAccion" NOT NULL,
    nombre character varying(100) NOT NULL,
    descripcion character varying(255),
    puntos integer NOT NULL,
    xp integer DEFAULT 0 NOT NULL,
    activo boolean DEFAULT true NOT NULL,
    created_at timestamp(3) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    updated_at timestamp(3) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL
);


ALTER TABLE public.configuracion_puntaje OWNER TO postgres;

--
-- Name: configuracion_puntaje_id_seq; Type: SEQUENCE; Schema: public; Owner: postgres
--

CREATE SEQUENCE public.configuracion_puntaje_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE public.configuracion_puntaje_id_seq OWNER TO postgres;

--
-- Name: configuracion_puntaje_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: postgres
--

ALTER SEQUENCE public.configuracion_puntaje_id_seq OWNED BY public.configuracion_puntaje.id;


--
-- Name: conversaciones; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.conversaciones (
    id integer NOT NULL,
    usuario_id integer,
    telefono character varying(20) NOT NULL,
    estado character varying(50) DEFAULT 'inicio'::character varying NOT NULL,
    contexto jsonb DEFAULT '{}'::jsonb NOT NULL,
    modulo_activo character varying(50),
    programa_en_edicion integer,
    ultimo_mensaje_at timestamp(3) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    created_at timestamp(3) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    updated_at timestamp(3) without time zone NOT NULL,
    modo public."ModoConversacion" DEFAULT 'BOT'::public."ModoConversacion" NOT NULL,
    derivada_a_id integer,
    derivada_at timestamp(3) without time zone,
    ultimo_mensaje character varying(500),
    mensajes_no_leidos integer DEFAULT 0 NOT NULL,
    modo_respuesta public."ModoRespuestaHandoff"
);


ALTER TABLE public.conversaciones OWNER TO postgres;

--
-- Name: conversaciones_id_seq; Type: SEQUENCE; Schema: public; Owner: postgres
--

CREATE SEQUENCE public.conversaciones_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE public.conversaciones_id_seq OWNER TO postgres;

--
-- Name: conversaciones_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: postgres
--

ALTER SEQUENCE public.conversaciones_id_seq OWNED BY public.conversaciones.id;


--
-- Name: eventos_especiales_config; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.eventos_especiales_config (
    id integer NOT NULL,
    codigo character varying(50) NOT NULL,
    nombre character varying(100) NOT NULL,
    descripcion character varying(255),
    puntos integer NOT NULL,
    xp integer DEFAULT 0 NOT NULL,
    icono character varying(50),
    color character varying(20),
    activo boolean DEFAULT true NOT NULL,
    created_at timestamp(3) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    updated_at timestamp(3) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL
);


ALTER TABLE public.eventos_especiales_config OWNER TO postgres;

--
-- Name: eventos_especiales_config_id_seq; Type: SEQUENCE; Schema: public; Owner: postgres
--

CREATE SEQUENCE public.eventos_especiales_config_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE public.eventos_especiales_config_id_seq OWNER TO postgres;

--
-- Name: eventos_especiales_config_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: postgres
--

ALTER SEQUENCE public.eventos_especiales_config_id_seq OWNED BY public.eventos_especiales_config.id;


--
-- Name: eventos_especiales_registro; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.eventos_especiales_registro (
    id integer NOT NULL,
    usuario_gam_id integer NOT NULL,
    evento_config_id integer NOT NULL,
    fecha date NOT NULL,
    notas character varying(255),
    registrado_por_id integer,
    created_at timestamp(3) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL
);


ALTER TABLE public.eventos_especiales_registro OWNER TO postgres;

--
-- Name: eventos_especiales_registro_id_seq; Type: SEQUENCE; Schema: public; Owner: postgres
--

CREATE SEQUENCE public.eventos_especiales_registro_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE public.eventos_especiales_registro_id_seq OWNER TO postgres;

--
-- Name: eventos_especiales_registro_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: postgres
--

ALTER SEQUENCE public.eventos_especiales_registro_id_seq OWNED BY public.eventos_especiales_registro.id;


--
-- Name: formulario_campos; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.formulario_campos (
    id integer NOT NULL,
    tipo_asistencia_id integer NOT NULL,
    nombre character varying(50) NOT NULL,
    label character varying(100) NOT NULL,
    tipo character varying(30) NOT NULL,
    requerido boolean DEFAULT false NOT NULL,
    orden integer DEFAULT 0 NOT NULL,
    placeholder character varying(100),
    valor_minimo integer,
    valor_maximo integer,
    opciones jsonb,
    activo boolean DEFAULT true NOT NULL,
    created_at timestamp(3) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL
);


ALTER TABLE public.formulario_campos OWNER TO postgres;

--
-- Name: formulario_campos_id_seq; Type: SEQUENCE; Schema: public; Owner: postgres
--

CREATE SEQUENCE public.formulario_campos_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE public.formulario_campos_id_seq OWNER TO postgres;

--
-- Name: formulario_campos_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: postgres
--

ALTER SEQUENCE public.formulario_campos_id_seq OWNED BY public.formulario_campos.id;


--
-- Name: grupos_ranking; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.grupos_ranking (
    id integer NOT NULL,
    codigo character varying(50) NOT NULL,
    nombre character varying(100) NOT NULL,
    descripcion text,
    icono character varying(10),
    color character varying(20),
    tipo public."TipoGrupoRanking" DEFAULT 'PERSONALIZADO'::public."TipoGrupoRanking" NOT NULL,
    criterio public."CriterioMembresia" DEFAULT 'MANUAL'::public."CriterioMembresia" NOT NULL,
    es_publico boolean DEFAULT true NOT NULL,
    solo_miembros boolean DEFAULT false NOT NULL,
    periodo_id integer,
    orden integer DEFAULT 0 NOT NULL,
    activo boolean DEFAULT true NOT NULL,
    creado_por_id integer,
    created_at timestamp(3) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    updated_at timestamp(3) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL
);


ALTER TABLE public.grupos_ranking OWNER TO postgres;

--
-- Name: grupos_ranking_id_seq; Type: SEQUENCE; Schema: public; Owner: postgres
--

CREATE SEQUENCE public.grupos_ranking_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE public.grupos_ranking_id_seq OWNER TO postgres;

--
-- Name: grupos_ranking_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: postgres
--

ALTER SEQUENCE public.grupos_ranking_id_seq OWNED BY public.grupos_ranking.id;


--
-- Name: grupos_ranking_miembros; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.grupos_ranking_miembros (
    id integer NOT NULL,
    grupo_id integer NOT NULL,
    usuario_id integer NOT NULL,
    oculto boolean DEFAULT false NOT NULL,
    agregado_por_id integer,
    agregado_at timestamp(3) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL
);


ALTER TABLE public.grupos_ranking_miembros OWNER TO postgres;

--
-- Name: grupos_ranking_miembros_id_seq; Type: SEQUENCE; Schema: public; Owner: postgres
--

CREATE SEQUENCE public.grupos_ranking_miembros_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE public.grupos_ranking_miembros_id_seq OWNER TO postgres;

--
-- Name: grupos_ranking_miembros_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: postgres
--

ALTER SEQUENCE public.grupos_ranking_miembros_id_seq OWNED BY public.grupos_ranking_miembros.id;


--
-- Name: historial_puntos; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.historial_puntos (
    id integer NOT NULL,
    usuario_gam_id integer NOT NULL,
    config_puntaje_id integer,
    periodo_ranking_id integer,
    puntos integer NOT NULL,
    xp integer DEFAULT 0 NOT NULL,
    descripcion character varying(255),
    fecha date NOT NULL,
    trimestre integer,
    anio integer,
    referencia_id integer,
    referencia_tipo character varying(50),
    created_at timestamp(3) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL
);


ALTER TABLE public.historial_puntos OWNER TO postgres;

--
-- Name: historial_puntos_id_seq; Type: SEQUENCE; Schema: public; Owner: postgres
--

CREATE SEQUENCE public.historial_puntos_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE public.historial_puntos_id_seq OWNER TO postgres;

--
-- Name: historial_puntos_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: postgres
--

ALTER SEQUENCE public.historial_puntos_id_seq OWNED BY public.historial_puntos.id;


--
-- Name: insignias; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.insignias (
    id integer NOT NULL,
    codigo character varying(50) NOT NULL,
    nombre character varying(100) NOT NULL,
    descripcion character varying(255),
    icono character varying(50),
    color character varying(20),
    condicion_tipo character varying(50) NOT NULL,
    condicion_valor integer NOT NULL,
    puntos_bonus integer DEFAULT 0 NOT NULL,
    xp_bonus integer DEFAULT 0 NOT NULL,
    activo boolean DEFAULT true NOT NULL,
    created_at timestamp(3) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL
);


ALTER TABLE public.insignias OWNER TO postgres;

--
-- Name: insignias_id_seq; Type: SEQUENCE; Schema: public; Owner: postgres
--

CREATE SEQUENCE public.insignias_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE public.insignias_id_seq OWNER TO postgres;

--
-- Name: insignias_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: postgres
--

ALTER SEQUENCE public.insignias_id_seq OWNED BY public.insignias.id;


--
-- Name: mensajes; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.mensajes (
    id integer NOT NULL,
    conversacion_id integer NOT NULL,
    contenido text NOT NULL,
    tipo character varying(20) DEFAULT 'texto'::character varying NOT NULL,
    metadata jsonb DEFAULT '{}'::jsonb NOT NULL,
    created_at timestamp(3) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    enviado_por_id integer,
    whatsapp_msg_id character varying(255),
    estado public."EstadoMensaje" DEFAULT 'ENVIADO'::public."EstadoMensaje" NOT NULL,
    leido_at timestamp(3) without time zone,
    direccion public."DireccionMensaje" NOT NULL
);


ALTER TABLE public.mensajes OWNER TO postgres;

--
-- Name: mensajes_id_seq; Type: SEQUENCE; Schema: public; Owner: postgres
--

CREATE SEQUENCE public.mensajes_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE public.mensajes_id_seq OWNER TO postgres;

--
-- Name: mensajes_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: postgres
--

ALTER SEQUENCE public.mensajes_id_seq OWNED BY public.mensajes.id;


--
-- Name: niveles_biblicos; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.niveles_biblicos (
    id integer NOT NULL,
    numero integer NOT NULL,
    nombre character varying(50) NOT NULL,
    descripcion character varying(255),
    xp_requerido integer NOT NULL,
    icono character varying(50),
    color character varying(20),
    activo boolean DEFAULT true NOT NULL,
    created_at timestamp(3) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL
);


ALTER TABLE public.niveles_biblicos OWNER TO postgres;

--
-- Name: niveles_biblicos_id_seq; Type: SEQUENCE; Schema: public; Owner: postgres
--

CREATE SEQUENCE public.niveles_biblicos_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE public.niveles_biblicos_id_seq OWNER TO postgres;

--
-- Name: niveles_biblicos_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: postgres
--

ALTER SEQUENCE public.niveles_biblicos_id_seq OWNED BY public.niveles_biblicos.id;


--
-- Name: notificaciones; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.notificaciones (
    id integer NOT NULL,
    usuario_id integer,
    telefono character varying(20) NOT NULL,
    tipo character varying(50) NOT NULL,
    mensaje text NOT NULL,
    programa_id integer,
    estado character varying(20) DEFAULT 'pendiente'::character varying NOT NULL,
    enviado_at timestamp(3) without time zone,
    error_mensaje text,
    created_at timestamp(3) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL
);


ALTER TABLE public.notificaciones OWNER TO postgres;

--
-- Name: notificaciones_id_seq; Type: SEQUENCE; Schema: public; Owner: postgres
--

CREATE SEQUENCE public.notificaciones_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE public.notificaciones_id_seq OWNER TO postgres;

--
-- Name: notificaciones_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: postgres
--

ALTER SEQUENCE public.notificaciones_id_seq OWNED BY public.notificaciones.id;


--
-- Name: partes; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.partes (
    id integer NOT NULL,
    nombre character varying(100) NOT NULL,
    descripcion text,
    orden integer NOT NULL,
    es_fija boolean DEFAULT false NOT NULL,
    texto_fijo character varying(100),
    activo boolean DEFAULT true NOT NULL,
    created_at timestamp(3) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    es_obligatoria boolean DEFAULT false NOT NULL,
    puntos integer DEFAULT 0 NOT NULL,
    xp integer DEFAULT 0 NOT NULL
);


ALTER TABLE public.partes OWNER TO postgres;

--
-- Name: partes_id_seq; Type: SEQUENCE; Schema: public; Owner: postgres
--

CREATE SEQUENCE public.partes_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE public.partes_id_seq OWNER TO postgres;

--
-- Name: partes_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: postgres
--

ALTER SEQUENCE public.partes_id_seq OWNED BY public.partes.id;


--
-- Name: periodos_ranking; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.periodos_ranking (
    id integer NOT NULL,
    nombre character varying(100) NOT NULL,
    descripcion text,
    fecha_inicio date NOT NULL,
    fecha_fin date,
    estado public."EstadoRanking" DEFAULT 'ACTIVO'::public."EstadoRanking" NOT NULL,
    creado_por_id integer,
    cerrado_at timestamp(3) without time zone,
    cerrado_por_id integer,
    resultados_json jsonb,
    created_at timestamp(3) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    updated_at timestamp(3) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL
);


ALTER TABLE public.periodos_ranking OWNER TO postgres;

--
-- Name: periodos_ranking_id_seq; Type: SEQUENCE; Schema: public; Owner: postgres
--

CREATE SEQUENCE public.periodos_ranking_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE public.periodos_ranking_id_seq OWNER TO postgres;

--
-- Name: periodos_ranking_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: postgres
--

ALTER SEQUENCE public.periodos_ranking_id_seq OWNED BY public.periodos_ranking.id;


--
-- Name: programa_asignaciones; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.programa_asignaciones (
    id integer NOT NULL,
    programa_id integer NOT NULL,
    parte_id integer NOT NULL,
    usuario_id integer,
    orden integer DEFAULT 1 NOT NULL,
    notificado boolean DEFAULT false NOT NULL,
    notificado_at timestamp(3) without time zone,
    confirmado boolean DEFAULT false NOT NULL,
    confirmado_at timestamp(3) without time zone,
    created_at timestamp(3) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    nombre_libre character varying(100)
);


ALTER TABLE public.programa_asignaciones OWNER TO postgres;

--
-- Name: programa_asignaciones_id_seq; Type: SEQUENCE; Schema: public; Owner: postgres
--

CREATE SEQUENCE public.programa_asignaciones_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE public.programa_asignaciones_id_seq OWNER TO postgres;

--
-- Name: programa_asignaciones_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: postgres
--

ALTER SEQUENCE public.programa_asignaciones_id_seq OWNED BY public.programa_asignaciones.id;


--
-- Name: programa_links; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.programa_links (
    id integer NOT NULL,
    programa_id integer NOT NULL,
    parte_id integer NOT NULL,
    nombre character varying(200) NOT NULL,
    url text NOT NULL,
    orden integer DEFAULT 1 NOT NULL,
    agregado_por integer,
    created_at timestamp(3) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL
);


ALTER TABLE public.programa_links OWNER TO postgres;

--
-- Name: programa_links_id_seq; Type: SEQUENCE; Schema: public; Owner: postgres
--

CREATE SEQUENCE public.programa_links_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE public.programa_links_id_seq OWNER TO postgres;

--
-- Name: programa_links_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: postgres
--

ALTER SEQUENCE public.programa_links_id_seq OWNED BY public.programa_links.id;


--
-- Name: programa_partes; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.programa_partes (
    id integer NOT NULL,
    programa_id integer NOT NULL,
    parte_id integer NOT NULL,
    orden integer NOT NULL,
    created_at timestamp(3) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL
);


ALTER TABLE public.programa_partes OWNER TO postgres;

--
-- Name: programa_partes_id_seq; Type: SEQUENCE; Schema: public; Owner: postgres
--

CREATE SEQUENCE public.programa_partes_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE public.programa_partes_id_seq OWNER TO postgres;

--
-- Name: programa_partes_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: postgres
--

ALTER SEQUENCE public.programa_partes_id_seq OWNED BY public.programa_partes.id;


--
-- Name: programas; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.programas (
    id integer NOT NULL,
    fecha date NOT NULL,
    titulo character varying(200) DEFAULT 'Programa Maranatha Adoración'::character varying NOT NULL,
    estado character varying(20) DEFAULT 'borrador'::character varying NOT NULL,
    texto_generado text,
    creado_por integer,
    enviado_at timestamp(3) without time zone,
    created_at timestamp(3) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    updated_at timestamp(3) without time zone NOT NULL,
    codigo character varying(20),
    hora_inicio time without time zone,
    hora_fin time without time zone
);


ALTER TABLE public.programas OWNER TO postgres;

--
-- Name: programas_id_seq; Type: SEQUENCE; Schema: public; Owner: postgres
--

CREATE SEQUENCE public.programas_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE public.programas_id_seq OWNER TO postgres;

--
-- Name: programas_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: postgres
--

ALTER SEQUENCE public.programas_id_seq OWNED BY public.programas.id;


--
-- Name: qr_asistencia; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.qr_asistencia (
    id integer NOT NULL,
    semana_inicio date NOT NULL,
    codigo character varying(50) NOT NULL,
    descripcion character varying(200),
    url_generada text,
    activo boolean DEFAULT true NOT NULL,
    hora_inicio time without time zone DEFAULT '09:00:00'::time without time zone NOT NULL,
    hora_fin time without time zone DEFAULT '12:00:00'::time without time zone NOT NULL,
    created_by integer,
    created_at timestamp(3) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    tipo_id integer,
    margen_temprana integer DEFAULT 15 NOT NULL,
    margen_tardia integer DEFAULT 30 NOT NULL
);


ALTER TABLE public.qr_asistencia OWNER TO postgres;

--
-- Name: qr_asistencia_id_seq; Type: SEQUENCE; Schema: public; Owner: postgres
--

CREATE SEQUENCE public.qr_asistencia_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE public.qr_asistencia_id_seq OWNER TO postgres;

--
-- Name: qr_asistencia_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: postgres
--

ALTER SEQUENCE public.qr_asistencia_id_seq OWNED BY public.qr_asistencia.id;


--
-- Name: roles; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.roles (
    id integer NOT NULL,
    nombre character varying(50) NOT NULL,
    descripcion text,
    created_at timestamp(3) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL
);


ALTER TABLE public.roles OWNER TO postgres;

--
-- Name: roles_id_seq; Type: SEQUENCE; Schema: public; Owner: postgres
--

CREATE SEQUENCE public.roles_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE public.roles_id_seq OWNER TO postgres;

--
-- Name: roles_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: postgres
--

ALTER SEQUENCE public.roles_id_seq OWNED BY public.roles.id;


--
-- Name: tipos_asistencia; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.tipos_asistencia (
    id integer NOT NULL,
    nombre character varying(50) NOT NULL,
    label character varying(100) NOT NULL,
    descripcion character varying(255),
    icono character varying(50),
    color character varying(20),
    solo_presencia boolean DEFAULT false NOT NULL,
    activo boolean DEFAULT true NOT NULL,
    orden integer DEFAULT 0 NOT NULL,
    created_at timestamp(3) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    updated_at timestamp(3) without time zone NOT NULL
);


ALTER TABLE public.tipos_asistencia OWNER TO postgres;

--
-- Name: tipos_asistencia_id_seq; Type: SEQUENCE; Schema: public; Owner: postgres
--

CREATE SEQUENCE public.tipos_asistencia_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE public.tipos_asistencia_id_seq OWNER TO postgres;

--
-- Name: tipos_asistencia_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: postgres
--

ALTER SEQUENCE public.tipos_asistencia_id_seq OWNED BY public.tipos_asistencia.id;


--
-- Name: usuarios; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.usuarios (
    id integer NOT NULL,
    codigo_pais character varying(5) DEFAULT '51'::character varying NOT NULL,
    telefono character varying(20) NOT NULL,
    password_hash character varying(255) NOT NULL,
    nombre character varying(100) NOT NULL,
    nombre_whatsapp character varying(100),
    email character varying(100),
    activo boolean DEFAULT true NOT NULL,
    debe_cambiar_password boolean DEFAULT true NOT NULL,
    ultimo_login timestamp(3) without time zone,
    created_at timestamp(3) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    updated_at timestamp(3) without time zone NOT NULL,
    foto_url character varying(500),
    fecha_nacimiento date,
    direccion character varying(200),
    biografia text,
    genero character varying(20),
    recibir_notificaciones_whatsapp boolean DEFAULT true NOT NULL,
    notificar_nuevas_conversaciones boolean DEFAULT true NOT NULL,
    modo_handoff_default public."ModoRespuestaHandoff" DEFAULT 'AMBOS'::public."ModoRespuestaHandoff" NOT NULL,
    participa_en_ranking boolean DEFAULT true NOT NULL,
    es_ja boolean DEFAULT true NOT NULL
);


ALTER TABLE public.usuarios OWNER TO postgres;

--
-- Name: usuarios_gamificacion; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.usuarios_gamificacion (
    id integer NOT NULL,
    usuario_id integer NOT NULL,
    puntos_total integer DEFAULT 0 NOT NULL,
    puntos_trimestre integer DEFAULT 0 NOT NULL,
    xp_total integer DEFAULT 0 NOT NULL,
    nivel_id integer DEFAULT 1 NOT NULL,
    racha_actual integer DEFAULT 0 NOT NULL,
    racha_mejor integer DEFAULT 0 NOT NULL,
    ultima_semana_asistio date,
    asistencias_totales integer DEFAULT 0 NOT NULL,
    participaciones_totales integer DEFAULT 0 NOT NULL,
    oculto_en_general boolean DEFAULT false NOT NULL,
    created_at timestamp(3) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    updated_at timestamp(3) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL
);


ALTER TABLE public.usuarios_gamificacion OWNER TO postgres;

--
-- Name: usuarios_gamificacion_id_seq; Type: SEQUENCE; Schema: public; Owner: postgres
--

CREATE SEQUENCE public.usuarios_gamificacion_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE public.usuarios_gamificacion_id_seq OWNER TO postgres;

--
-- Name: usuarios_gamificacion_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: postgres
--

ALTER SEQUENCE public.usuarios_gamificacion_id_seq OWNED BY public.usuarios_gamificacion.id;


--
-- Name: usuarios_id_seq; Type: SEQUENCE; Schema: public; Owner: postgres
--

CREATE SEQUENCE public.usuarios_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE public.usuarios_id_seq OWNER TO postgres;

--
-- Name: usuarios_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: postgres
--

ALTER SEQUENCE public.usuarios_id_seq OWNED BY public.usuarios.id;


--
-- Name: usuarios_insignias; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.usuarios_insignias (
    id integer NOT NULL,
    usuario_gam_id integer NOT NULL,
    insignia_id integer NOT NULL,
    desbloqueada_at timestamp(3) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    notificado boolean DEFAULT false NOT NULL
);


ALTER TABLE public.usuarios_insignias OWNER TO postgres;

--
-- Name: usuarios_insignias_id_seq; Type: SEQUENCE; Schema: public; Owner: postgres
--

CREATE SEQUENCE public.usuarios_insignias_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE public.usuarios_insignias_id_seq OWNER TO postgres;

--
-- Name: usuarios_insignias_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: postgres
--

ALTER SEQUENCE public.usuarios_insignias_id_seq OWNED BY public.usuarios_insignias.id;


--
-- Name: usuarios_partes; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.usuarios_partes (
    id integer NOT NULL,
    usuario_id integer NOT NULL,
    parte_id integer NOT NULL,
    ultima_participacion date,
    total_participaciones integer DEFAULT 0 NOT NULL,
    created_at timestamp(3) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL
);


ALTER TABLE public.usuarios_partes OWNER TO postgres;

--
-- Name: usuarios_partes_id_seq; Type: SEQUENCE; Schema: public; Owner: postgres
--

CREATE SEQUENCE public.usuarios_partes_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE public.usuarios_partes_id_seq OWNER TO postgres;

--
-- Name: usuarios_partes_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: postgres
--

ALTER SEQUENCE public.usuarios_partes_id_seq OWNED BY public.usuarios_partes.id;


--
-- Name: usuarios_roles; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.usuarios_roles (
    id integer NOT NULL,
    usuario_id integer NOT NULL,
    rol_id integer NOT NULL,
    asignado_por integer,
    created_at timestamp(3) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL
);


ALTER TABLE public.usuarios_roles OWNER TO postgres;

--
-- Name: usuarios_roles_id_seq; Type: SEQUENCE; Schema: public; Owner: postgres
--

CREATE SEQUENCE public.usuarios_roles_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE public.usuarios_roles_id_seq OWNER TO postgres;

--
-- Name: usuarios_roles_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: postgres
--

ALTER SEQUENCE public.usuarios_roles_id_seq OWNED BY public.usuarios_roles.id;


--
-- Name: asistencias id; Type: DEFAULT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.asistencias ALTER COLUMN id SET DEFAULT nextval('public.asistencias_id_seq'::regclass);


--
-- Name: audit_log id; Type: DEFAULT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.audit_log ALTER COLUMN id SET DEFAULT nextval('public.audit_log_id_seq'::regclass);


--
-- Name: configuracion_puntaje id; Type: DEFAULT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.configuracion_puntaje ALTER COLUMN id SET DEFAULT nextval('public.configuracion_puntaje_id_seq'::regclass);


--
-- Name: conversaciones id; Type: DEFAULT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.conversaciones ALTER COLUMN id SET DEFAULT nextval('public.conversaciones_id_seq'::regclass);


--
-- Name: eventos_especiales_config id; Type: DEFAULT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.eventos_especiales_config ALTER COLUMN id SET DEFAULT nextval('public.eventos_especiales_config_id_seq'::regclass);


--
-- Name: eventos_especiales_registro id; Type: DEFAULT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.eventos_especiales_registro ALTER COLUMN id SET DEFAULT nextval('public.eventos_especiales_registro_id_seq'::regclass);


--
-- Name: formulario_campos id; Type: DEFAULT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.formulario_campos ALTER COLUMN id SET DEFAULT nextval('public.formulario_campos_id_seq'::regclass);


--
-- Name: grupos_ranking id; Type: DEFAULT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.grupos_ranking ALTER COLUMN id SET DEFAULT nextval('public.grupos_ranking_id_seq'::regclass);


--
-- Name: grupos_ranking_miembros id; Type: DEFAULT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.grupos_ranking_miembros ALTER COLUMN id SET DEFAULT nextval('public.grupos_ranking_miembros_id_seq'::regclass);


--
-- Name: historial_puntos id; Type: DEFAULT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.historial_puntos ALTER COLUMN id SET DEFAULT nextval('public.historial_puntos_id_seq'::regclass);


--
-- Name: insignias id; Type: DEFAULT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.insignias ALTER COLUMN id SET DEFAULT nextval('public.insignias_id_seq'::regclass);


--
-- Name: mensajes id; Type: DEFAULT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.mensajes ALTER COLUMN id SET DEFAULT nextval('public.mensajes_id_seq'::regclass);


--
-- Name: niveles_biblicos id; Type: DEFAULT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.niveles_biblicos ALTER COLUMN id SET DEFAULT nextval('public.niveles_biblicos_id_seq'::regclass);


--
-- Name: notificaciones id; Type: DEFAULT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.notificaciones ALTER COLUMN id SET DEFAULT nextval('public.notificaciones_id_seq'::regclass);


--
-- Name: partes id; Type: DEFAULT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.partes ALTER COLUMN id SET DEFAULT nextval('public.partes_id_seq'::regclass);


--
-- Name: periodos_ranking id; Type: DEFAULT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.periodos_ranking ALTER COLUMN id SET DEFAULT nextval('public.periodos_ranking_id_seq'::regclass);


--
-- Name: programa_asignaciones id; Type: DEFAULT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.programa_asignaciones ALTER COLUMN id SET DEFAULT nextval('public.programa_asignaciones_id_seq'::regclass);


--
-- Name: programa_links id; Type: DEFAULT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.programa_links ALTER COLUMN id SET DEFAULT nextval('public.programa_links_id_seq'::regclass);


--
-- Name: programa_partes id; Type: DEFAULT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.programa_partes ALTER COLUMN id SET DEFAULT nextval('public.programa_partes_id_seq'::regclass);


--
-- Name: programas id; Type: DEFAULT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.programas ALTER COLUMN id SET DEFAULT nextval('public.programas_id_seq'::regclass);


--
-- Name: qr_asistencia id; Type: DEFAULT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.qr_asistencia ALTER COLUMN id SET DEFAULT nextval('public.qr_asistencia_id_seq'::regclass);


--
-- Name: roles id; Type: DEFAULT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.roles ALTER COLUMN id SET DEFAULT nextval('public.roles_id_seq'::regclass);


--
-- Name: tipos_asistencia id; Type: DEFAULT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.tipos_asistencia ALTER COLUMN id SET DEFAULT nextval('public.tipos_asistencia_id_seq'::regclass);


--
-- Name: usuarios id; Type: DEFAULT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.usuarios ALTER COLUMN id SET DEFAULT nextval('public.usuarios_id_seq'::regclass);


--
-- Name: usuarios_gamificacion id; Type: DEFAULT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.usuarios_gamificacion ALTER COLUMN id SET DEFAULT nextval('public.usuarios_gamificacion_id_seq'::regclass);


--
-- Name: usuarios_insignias id; Type: DEFAULT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.usuarios_insignias ALTER COLUMN id SET DEFAULT nextval('public.usuarios_insignias_id_seq'::regclass);


--
-- Name: usuarios_partes id; Type: DEFAULT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.usuarios_partes ALTER COLUMN id SET DEFAULT nextval('public.usuarios_partes_id_seq'::regclass);


--
-- Name: usuarios_roles id; Type: DEFAULT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.usuarios_roles ALTER COLUMN id SET DEFAULT nextval('public.usuarios_roles_id_seq'::regclass);


--
-- Data for Name: _prisma_migrations; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public._prisma_migrations (id, checksum, finished_at, migration_name, logs, rolled_back_at, started_at, applied_steps_count) FROM stdin;
72bce67f-d2fb-46a6-8260-18ab74f33af7	a5eda3fe192aae63613d01a3fe44ba4718141c0b9de52c0165fc6c0da8ff98f7	2026-01-24 11:36:06.204209+00	20260120034947_init	\N	\N	2026-01-24 11:36:05.776273+00	1
a8dbd45b-16fb-48ab-b24d-f5070bb884c4	db85e3ac6bece9059d7011e75b7ae7c4bc3901c42213dfd81a1ecb38a9826d84	2026-01-24 11:36:06.231576+00	20260120035110_remove_telefono_anterior	\N	\N	2026-01-24 11:36:06.207639+00	1
8bfbcb91-9df9-485f-bf42-be19e1ba7698	2c7344aa939dc8b962083e20f081c8845deed1ec629d341f1f7b68aaf418ae94	2026-01-24 11:36:06.256571+00	20260120152251_init	\N	\N	2026-01-24 11:36:06.239397+00	1
e4f72aa4-c20d-41b9-a18d-219c243bc8aa	db8e15cb12735ed8f93aaef01f559f052fd4c2ec5a84aa0a20750fe51ee4ccc8	2026-01-24 11:36:06.31245+00	20260120174901_add_programa_partes	\N	\N	2026-01-24 11:36:06.260135+00	1
b51dc398-923f-4dae-8c27-58f376120dc7	3aa7de381317b27ce886626dcb012491b1f46a78d8dc6e771cda6af2a1b7cb85	2026-01-24 11:36:06.390389+00	20260121190000_add_tipos_asistencia_and_nombre_libre	\N	\N	2026-01-24 11:36:06.319034+00	1
5c672b46-066b-4e13-97b0-ef1cd064317f	d26fd32049e5cdcbf7d7b3acf8f3a06ec57949ee6b582cda53c9cbac954b240a	2026-01-27 03:18:15.400443+00	20260126000000_add_programa_columns	\N	\N	2026-01-27 03:18:15.355927+00	1
4b135436-c05f-4837-b86a-ff5ded3d65e8	8a0fae75e214dcc5edc3e32dd9eefcbdfe79e9f9f17721e2de4852e9a2c69908	2026-01-30 22:57:21.752586+00	20260129000000_add_inbox_handoff	\N	\N	2026-01-30 22:57:21.685495+00	1
218952c0-9120-478b-bf1c-c55d0c711b31	b63a49cf021ac3ce335b730efdc6b598ad73bfa7fb3bc3556945d813d81d2f13	2026-01-30 22:57:21.961892+00	20260129050000_add_gamificacion_complete	\N	\N	2026-01-30 22:57:21.755191+00	1
38fd1b52-6fa8-419b-abcc-e7eb4f5b637f	6d4de64a270f36fd358507f39970107e789ffcd9d930422471e7412af60f032b	2026-01-30 22:57:21.973736+00	20260129100000_add_qr_margins_and_parte_gamification	\N	\N	2026-01-30 22:57:21.963908+00	1
3caced93-08aa-479c-958d-ed1357eadd5a	f6c8d74615ebb8be4200044a592c143d9c2f6e5fe3ba9106a1d97cd146e32a86	2026-01-30 22:57:21.992122+00	20260129110000_seed_partes_gamification_points	\N	\N	2026-01-30 22:57:21.975422+00	1
a012b963-2d59-436f-b4ca-ef721a0bad34	930b46b2dd3eed51cc21c6e0e183d2144b0755d0dec288f0e5632fe61da0dd55	2026-01-30 22:57:22.003833+00	20260129120000_remove_participacion_from_config_puntaje	\N	\N	2026-01-30 22:57:21.994189+00	1
0ddc0acc-4bfb-47ae-a3dc-52a4a08604a7	f23f379ee44a8dec9089fbda634c16ca18ab50eea805170459e6080a7771642e	2026-01-30 22:57:22.02879+00	20260129200000_add_periodo_ranking	\N	\N	2026-01-30 22:57:22.005508+00	1
ce1725b8-8f2c-417e-afab-b121e7fea00a	b125d8be5ec28b4b2adb2246e18e4c99e49d3c6315b0d5ba07b07b9afc655a4f	2026-01-30 22:57:22.040147+00	20260129220000_add_grupos_ranking	\N	\N	2026-01-30 22:57:22.03025+00	1
322a4630-514e-4ad0-a9f7-c60b21aeae5c	33908e6d6058953d76de1d73dd23492a6a748f40e7e041f1f180489867ae1f01	2026-01-30 22:57:22.050684+00	20260130030000_change_asistencia_unique_constraint	\N	\N	2026-01-30 22:57:22.041857+00	1
\.


--
-- Data for Name: asistencias; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public.asistencias (id, usuario_id, fecha, semana_inicio, metodo_registro, estado, confirmado_por, confirmado_at, notas_confirmacion, qr_id, created_at, datos_formulario, nombre_registro, telefono_registro, tipo_id) FROM stdin;
1	1	2026-01-24	2026-01-24	qr_bot	confirmado	1	2026-01-24 12:29:36.531	\N	1	2026-01-24 12:29:23.745	{"dias_estudio": 5, "estudio_biblico": false}	Jorge Luis Vasquez	51940393758	1
2	23	2026-01-24	2026-01-24	qr_bot	confirmado	1	2026-01-24 14:19:25.131	\N	1	2026-01-24 14:18:48.903	{"dias_estudio": 7, "estudio_biblico": false}	moyjose25	51996160566	1
8	\N	2026-01-24	2026-01-24	manual	confirmado	1	2026-01-24 14:52:51.908	\N	1	2026-01-24 14:52:51.91	{"dias_estudio": 7, "estudio_biblico": true}	Nilson	901737522	1
9	\N	2026-01-24	2026-01-24	manual	confirmado	1	2026-01-24 14:53:45.222	\N	1	2026-01-24 14:53:45.223	{"dias_estudio": 7, "estudio_biblico": false}	Cristhian	928692860	1
11	27	2026-01-24	2026-01-24	manual	confirmado	1	2026-01-24 14:54:30.582	\N	1	2026-01-24 14:54:30.583	{"dias_estudio": 6, "estudio_biblico": false}	\N	\N	1
7	28	2026-01-24	2026-01-24	qr_bot	confirmado	1	2026-01-24 14:55:17.579	\N	1	2026-01-24 14:52:41.178	{"dias_estudio": 7, "estudio_biblico": false}	Niki	51990134132	1
6	7	2026-01-24	2026-01-24	qr_bot	confirmado	1	2026-01-24 14:55:18.531	\N	1	2026-01-24 14:52:39.037	{"dias_estudio": 7, "estudio_biblico": false}	Anyela💖	51993803296	1
3	26	2026-01-24	2026-01-24	qr_bot	confirmado	1	2026-01-24 14:55:21.946	\N	1	2026-01-24 14:51:30.414	{"dias_estudio": 7, "estudio_biblico": false}	Fanny Calderon	51963895061	1
12	9	2026-01-24	2026-01-24	qr_bot	confirmado	1	2026-01-24 18:08:23.627	\N	1	2026-01-24 18:08:11.283	{"dias_estudio": 6, "estudio_biblico": false}	I. Pamela 😎	51984121155	1
13	19	2026-01-24	2026-01-24	qr_bot	confirmado	1	2026-01-24 18:11:05.048	\N	1	2026-01-24 18:10:48.94	{"dias_estudio": 0, "estudio_biblico": false}	A. PATRICIA⚡🌱	51927934296	1
14	5	2026-01-24	2026-01-24	qr_bot	confirmado	1	2026-01-24 18:12:57.763	\N	1	2026-01-24 18:11:40.403	{"dias_estudio": 7, "estudio_biblico": false}	Jean	51932287482	1
15	10	2026-01-24	2026-01-24	qr_bot	confirmado	1	2026-01-24 18:13:25.023	\N	1	2026-01-24 18:13:11.355	{"dias_estudio": 3, "estudio_biblico": false}	Beeel	51933714369	1
17	25	2026-01-24	2026-01-24	qr_bot	confirmado	1	2026-01-25 00:50:27.285	\N	1	2026-01-24 18:14:28.021	{"dias_estudio": 1, "estudio_biblico": false}	Zelo🤠 Lee	51975662737	1
16	32	2026-01-24	2026-01-24	qr_bot	confirmado	1	2026-01-25 00:50:30.423	\N	1	2026-01-24 18:14:01.515	{"dias_estudio": 2, "estudio_biblico": false}	Annie Chávez	51902098838	1
5	452	2026-01-24	2026-01-24	qr_bot	confirmado	1	2026-01-24 14:55:19.601	\N	1	2026-01-24 14:52:35.59	{"dias_estudio": 7, "estudio_biblico": false}	JC	51944469639	1
10	453	2026-01-24	2026-01-24	qr_bot	confirmado	1	2026-01-24 14:55:16.774	\N	1	2026-01-24 14:54:01.022	{"dias_estudio": 6, "estudio_biblico": false}	William	51970332361	1
4	454	2026-01-24	2026-01-24	qr_bot	confirmado	1	2026-01-24 14:55:20.988	\N	1	2026-01-24 14:52:27.686	{"dias_estudio": 6, "estudio_biblico": true}	Almendra Solórzano Chang	51994068967	1
22	27	2026-01-30	2026-01-24	qr_bot	confirmado	1	2026-01-31 01:03:24.113	\N	2	2026-01-31 01:03:21.139	{}	yuxy Milangel	51966386930	3
21	8	2026-01-30	2026-01-24	qr_bot	confirmado	1	2026-01-31 01:03:25.089	\N	2	2026-01-31 01:03:08.131	{}	B.Ch	51970508614	3
20	7	2026-01-30	2026-01-24	qr_bot	confirmado	1	2026-01-31 01:03:25.906	\N	2	2026-01-31 01:02:41.185	{}	Anyela💖	51993803296	3
19	3	2026-01-30	2026-01-24	qr_bot	confirmado	1	2026-01-31 01:03:26.686	\N	2	2026-01-31 01:01:53.35	{}	Gobernaba en aquel tiempo	51962236060	3
18	10	2026-01-30	2026-01-24	qr_bot	confirmado	1	2026-01-31 01:03:27.439	\N	2	2026-01-31 01:01:25.08	{}	Beeel	51933714369	3
23	450	2026-01-30	2026-01-24	manual	confirmado	1	2026-01-31 01:14:02.706	\N	2	2026-01-31 01:14:02.707	{}	\N	\N	3
24	23	2026-01-30	2026-01-24	manual	confirmado	1	2026-01-31 01:14:08.948	\N	2	2026-01-31 01:14:08.949	{}	\N	\N	3
25	19	2026-01-30	2026-01-24	manual	confirmado	1	2026-01-31 01:14:15.083	\N	2	2026-01-31 01:14:15.084	{}	\N	\N	3
26	449	2026-01-30	2026-01-24	manual	confirmado	1	2026-01-31 01:20:06.133	\N	2	2026-01-31 01:20:06.134	{}	\N	\N	3
27	16	2026-01-30	2026-01-24	manual	confirmado	1	2026-01-31 01:23:44.859	\N	2	2026-01-31 01:23:44.861	{}	\N	\N	3
28	\N	2026-01-30	2026-01-24	manual	confirmado	1	2026-01-31 01:24:25.073	\N	2	2026-01-31 01:24:25.074	{}	Noris	00000000	3
29	22	2026-01-30	2026-01-24	manual	confirmado	1	2026-01-31 01:26:32.916	\N	2	2026-01-31 01:26:32.918	{}	\N	\N	3
30	5	2026-01-30	2026-01-24	manual	confirmado	1	2026-01-31 02:01:18.466	\N	2	2026-01-31 02:01:18.467	{}	\N	\N	3
33	1	2026-01-30	2026-01-30	manual_historico	confirmado	1	2026-01-31 08:46:36.953	\N	2	2026-01-31 08:46:36.954	{}	\N	\N	3
35	1	2026-01-31	2026-01-31	qr_bot	confirmado	1	2026-01-31 14:05:18.26	\N	4	2026-01-31 14:05:10.202	{"dias_estudio": 4, "estudio_biblico": false}	Jorge Luis Vasquez	51940393758	1
36	26	2026-01-31	2026-01-31	qr_bot	confirmado	1	2026-01-31 14:08:27.994	\N	4	2026-01-31 14:06:45.443	{"dias_estudio": 7, "estudio_biblico": false}	Fanny Calderon	51963895061	1
37	3	2026-01-31	2026-01-31	qr_bot	confirmado	1	2026-01-31 14:37:47.056	\N	4	2026-01-31 14:21:24.301	{"dias_estudio": 7, "estudio_biblico": false}	Gobernaba en aquel tiempo	51962236060	1
38	27	2026-01-31	2026-01-31	manual	confirmado	1	2026-01-31 14:40:31.393	\N	4	2026-01-31 14:40:31.394	{"dias_estudio": 5, "estudio_biblico": false}	\N	\N	1
39	452	2026-01-31	2026-01-31	manual	confirmado	1	2026-01-31 14:48:41.404	\N	4	2026-01-31 14:48:41.405	{"dias_estudio": 7, "estudio_biblico": false}	\N	\N	1
40	28	2026-01-31	2026-01-31	qr_bot	confirmado	1	2026-01-31 14:49:39.172	\N	4	2026-01-31 14:49:01.599	{"dias_estudio": 7, "estudio_biblico": false}	Niki	51990134132	1
41	23	2026-01-31	2026-01-31	qr_bot	confirmado	1	2026-01-31 14:50:11.562	\N	4	2026-01-31 14:49:48.458	{"dias_estudio": 7, "estudio_biblico": false}	moyjose25	51996160566	1
43	\N	2026-01-31	2026-01-31	manual	confirmado	1	2026-01-31 15:00:00.828	\N	4	2026-01-31 15:00:00.829	{"dias_estudio": 0, "estudio_biblico": false}	Irenia Quispe 	936753772	1
44	\N	2026-01-31	2026-01-31	qr_bot	confirmado	1	2026-01-31 15:36:13.403	\N	4	2026-01-31 15:33:24.044	{"dias_estudio": 7, "estudio_biblico": false}	Carlos Arturo	51969337284	1
45	7	2026-01-31	2026-01-31	qr_bot	confirmado	1	2026-01-31 15:36:14.09	\N	4	2026-01-31 15:35:07.348	{"dias_estudio": 6, "estudio_biblico": true}	Anyela💖	51993803296	1
46	\N	2026-01-31	2026-01-31	manual	confirmado	1	2026-01-31 15:37:51.101	\N	4	2026-01-31 15:37:51.102	{"dias_estudio": 6, "estudio_biblico": false}	Jhonatan salcedo	951326379	1
47	450	2026-01-31	2026-01-31	manual	confirmado	1	2026-01-31 15:40:00.899	\N	4	2026-01-31 15:40:00.9	{"dias_estudio": 6, "estudio_biblico": false}	\N	\N	1
\.


--
-- Data for Name: audit_log; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public.audit_log (id, usuario_id, accion, tabla_afectada, registro_id, datos_anteriores, datos_nuevos, created_at) FROM stdin;
\.


--
-- Data for Name: configuracion_puntaje; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public.configuracion_puntaje (id, codigo, categoria, nombre, descripcion, puntos, xp, activo, created_at, updated_at) FROM stdin;
1	asistencia_temprana	ASISTENCIA	Asistencia Temprana	Llegar antes de la hora de inicio	5	8	t	2026-01-30 22:57:21.981	2026-02-01 14:43:53.495
2	asistencia_normal	ASISTENCIA	Asistencia Normal	Llegar dentro del margen establecido	3	5	t	2026-01-30 22:57:21.981	2026-02-01 14:43:53.5
3	asistencia_tardia	ASISTENCIA	Asistencia Tardía	Llegar después del margen	1	2	t	2026-01-30 22:57:21.981	2026-02-01 14:43:53.504
4	racha_4_semanas	BONUS	Racha 4 semanas	Asistir 4 semanas consecutivas	10	15	t	2026-01-30 22:57:21.981	2026-02-01 14:43:53.507
5	racha_8_semanas	BONUS	Racha 8 semanas	Asistir 8 semanas consecutivas	20	30	t	2026-01-30 22:57:21.981	2026-02-01 14:43:53.51
6	racha_12_semanas	BONUS	Racha 12 semanas	Asistir 12 semanas consecutivas	50	75	t	2026-01-30 22:57:21.981	2026-02-01 14:43:53.513
28	direccion_programa	PARTICIPACION	Dirección de Programa	Dirigir el programa JA	10	20	t	2026-01-30 23:09:01.655	2026-01-30 23:09:01.655
29	tema_central	PARTICIPACION	Tema Central	Presentar el tema central	8	16	t	2026-01-30 23:09:01.659	2026-01-30 23:09:01.659
30	oracion	PARTICIPACION	Oración	Participar con oración	3	6	t	2026-01-30 23:09:01.664	2026-01-30 23:09:01.664
31	cantos	PARTICIPACION	Espacio de Cantos	Dirigir cantos	5	10	t	2026-01-30 23:09:01.668	2026-01-30 23:09:01.668
32	especial	PARTICIPACION	Especial Musical	Participar con especial	6	12	t	2026-01-30 23:09:01.672	2026-01-30 23:09:01.672
33	notijoven	PARTICIPACION	Notijoven	Presentar notijoven	4	8	t	2026-01-30 23:09:01.677	2026-01-30 23:09:01.677
34	dinamica	PARTICIPACION	Dinámica	Dirigir dinámica	4	8	t	2026-01-30 23:09:01.681	2026-01-30 23:09:01.681
35	testimonio	PARTICIPACION	Testimonio	Compartir testimonio	5	10	t	2026-01-30 23:09:01.687	2026-01-30 23:09:01.687
\.


--
-- Data for Name: conversaciones; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public.conversaciones (id, usuario_id, telefono, estado, contexto, modulo_activo, programa_en_edicion, ultimo_mensaje_at, created_at, updated_at, modo, derivada_a_id, derivada_at, ultimo_mensaje, mensajes_no_leidos, modo_respuesta) FROM stdin;
7	\N	51944469639	inicio	{}	\N	\N	2026-01-24 14:52:36.178	2026-01-24 14:52:07.223	2026-01-24 14:52:36.179	BOT	\N	\N	\N	0	\N
9	9	51984121155	inicio	{}	\N	\N	2026-01-24 18:08:11.902	2026-01-24 18:07:42.957	2026-01-24 18:08:11.904	BOT	\N	\N	\N	0	\N
12	25	51975662737	inicio	{}	\N	\N	2026-01-24 18:14:28.411	2026-01-24 18:12:05.801	2026-01-24 18:14:28.412	BOT	\N	\N	\N	0	\N
4	\N	51970332361	inicio	{}	\N	\N	2026-01-24 14:54:01.709	2026-01-24 14:51:32.77	2026-01-24 14:54:01.71	BOT	\N	\N	\N	0	\N
11	5	51932287482	inicio	{}	\N	\N	2026-01-24 18:11:40.9	2026-01-24 18:11:12.26	2026-01-24 18:11:40.901	BOT	\N	\N	\N	0	\N
1	1	51940393758	inicio	{}	\N	\N	2026-01-31 14:05:10.814	2026-01-24 12:29:07.671	2026-01-31 14:05:10.816	BOT	\N	\N	✅ *¡Asistencia registrada!*\n\n📋 Escuela Sabática\n👤 Jorge Luis Vasquez\n📅 31/1/2026\n\n📝 *Datos registrados:*\n   • dias_estudio: 4\n   • estudio_biblico: false\n\n¡Dios te bendiga! 🙏	7	\N
3	26	51963895061	inicio	{}	\N	\N	2026-01-31 14:06:46.01	2026-01-24 14:51:11.663	2026-01-31 14:06:46.011	BOT	\N	\N	✅ *¡Asistencia registrada!*\n\n📋 Escuela Sabática\n👤 Fanny Calderon\n📅 31/1/2026\n\n📝 *Datos registrados:*\n   • dias_estudio: 7\n   • estudio_biblico: false\n\n¡Dios te bendiga! 🙏	3	\N
6	\N	51994068967	formulario_asistencia	{"qrId": 4, "campos": [{"id": 1, "tipo": "number", "label": "Días de estudio de lección", "orden": 1, "activo": true, "nombre": "dias_estudio", "opciones": null, "createdAt": "2026-01-24T11:36:41.322Z", "requerido": false, "placeholder": "¿Cuántos días estudiaste la lección?", "valorMaximo": 7, "valorMinimo": 0, "tipoAsistenciaId": 1}, {"id": 2, "tipo": "checkbox", "label": "¿Hizo estudio bíblico esta semana?", "orden": 2, "activo": true, "nombre": "estudio_biblico", "opciones": null, "createdAt": "2026-01-24T11:36:41.336Z", "requerido": false, "placeholder": null, "valorMaximo": null, "valorMinimo": null, "tipoAsistenciaId": 1}], "tipoId": 1, "codigoQR": "JAGBQD5G4R", "respuestas": {"dias_estudio": 1}, "tipoNombre": "Escuela Sabática", "campoActual": 1}	asistencia	\N	2026-01-31 15:35:33.07	2026-01-24 14:52:04.289	2026-01-31 17:17:05.787	BOT	\N	\N	📝 *¿Hizo estudio bíblico esta semana?*\n_(Responde "sí" o "no")_	0	\N
18	\N	51922281802	formulario_asistencia	{"qrId": 4, "campos": [{"id": 1, "tipo": "number", "label": "Días de estudio de lección", "orden": 1, "activo": true, "nombre": "dias_estudio", "opciones": null, "createdAt": "2026-01-24T11:36:41.322Z", "requerido": false, "placeholder": "¿Cuántos días estudiaste la lección?", "valorMaximo": 7, "valorMinimo": 0, "tipoAsistenciaId": 1}, {"id": 2, "tipo": "checkbox", "label": "¿Hizo estudio bíblico esta semana?", "orden": 2, "activo": true, "nombre": "estudio_biblico", "opciones": null, "createdAt": "2026-01-24T11:36:41.336Z", "requerido": false, "placeholder": null, "valorMaximo": null, "valorMinimo": null, "tipoAsistenciaId": 1}], "tipoId": 1, "codigoQR": "JAGBQD5G4R", "respuestas": {}, "tipoNombre": "Escuela Sabática", "campoActual": 0}	asistencia	\N	2026-01-31 14:48:56.735	2026-01-31 14:48:56.433	2026-01-31 17:17:39.039	BOT	\N	\N	⚠️ Por favor ingresa un número válido.	0	\N
15	3	51962236060	inicio	{}	\N	\N	2026-01-31 14:21:24.941	2026-01-31 01:01:52.721	2026-01-31 17:17:49.553	BOT	\N	\N	✅ *¡Asistencia registrada!*\n\n📋 Escuela Sabática\n👤 Gobernaba en aquel tiempo\n📅 31/1/2026\n\n📝 *Datos registrados:*\n   • dias_estudio: 7\n   • estudio_biblico: false\n\n¡Dios te bendiga! 🙏	0	\N
8	28	51990134132	inicio	{}	\N	\N	2026-01-31 14:49:02.068	2026-01-24 14:52:14.114	2026-01-31 17:17:59.157	BOT	\N	\N	✅ *¡Asistencia registrada!*\n\n📋 Escuela Sabática\n👤 Niki\n📅 31/1/2026\n\n📝 *Datos registrados:*\n   • dias_estudio: 7\n   • estudio_biblico: false\n\n¡Dios te bendiga! 🙏	0	\N
5	7	51993803296	inicio	{}	\N	\N	2026-01-31 15:35:07.97	2026-01-24 14:51:57.35	2026-01-31 17:18:09.946	BOT	\N	\N	✅ *¡Asistencia registrada!*\n\n📋 Escuela Sabática\n👤 Anyela💖\n📅 31/1/2026\n\n📝 *Datos registrados:*\n   • dias_estudio: 6\n   • estudio_biblico: true\n\n¡Dios te bendiga! 🙏	0	\N
17	27	51966386930	inicio	{}	\N	\N	2026-01-31 01:03:21.836	2026-01-31 01:03:20.685	2026-01-31 01:30:33.065	BOT	\N	\N	JAWN42SPAR	0	\N
14	10	51933714369	inicio	{}	\N	\N	2026-01-31 01:01:25.85	2026-01-24 18:12:57.294	2026-01-31 01:30:37.398	BOT	\N	\N	JAWN42SPAR	0	\N
21	455	51900425478	inicio	{}	\N	\N	2026-01-31 17:52:46.591	2026-01-31 17:52:46.591	2026-01-31 20:53:21.6	BOT	\N	\N	¡Hola Alicia! 👋\n\n¿En qué puedo ayudarte?\n\nEscribe *ayuda* para ver los comandos disponibles.	0	\N
10	19	51927934296	inicio	{}	\N	\N	2026-01-31 02:50:26.948	2026-01-24 18:10:25.06	2026-01-31 05:28:19.305	BOT	\N	\N	Nop	0	\N
13	32	51902098838	inicio	{}	\N	\N	2026-01-24 18:14:02.024	2026-01-24 18:12:30.115	2026-01-31 05:28:28.888	BOT	\N	\N	\N	0	\N
16	8	51970508614	inicio	{}	\N	\N	2026-01-31 01:03:08.975	2026-01-31 01:03:07.577	2026-01-31 05:28:39.69	BOT	\N	\N	No jugar con el bot porfavor	0	WEB
2	23	51996160566	inicio	{}	\N	\N	2026-01-31 14:49:49.157	2026-01-24 14:18:25.388	2026-01-31 17:18:00.879	BOT	\N	\N	✅ *¡Asistencia registrada!*\n\n📋 Escuela Sabática\n👤 moyjose25\n📅 31/1/2026\n\n📝 *Datos registrados:*\n   • dias_estudio: 7\n   • estudio_biblico: false\n\n¡Dios te bendiga! 🙏	0	\N
20	\N	51969337284	inicio	{}	\N	\N	2026-01-31 15:33:24.737	2026-01-31 15:32:31.853	2026-02-01 05:43:10.754	BOT	\N	\N	✅ *¡Asistencia registrada!*\n\n📋 Escuela Sabática\n👤 Carlos Arturo\n📅 31/1/2026\n\n📝 *Datos registrados:*\n   • dias_estudio: 7\n   • estudio_biblico: false\n\n¡Dios te bendiga! 🙏	0	\N
19	\N	51936753772	formulario_asistencia	{"qrId": 4, "campos": [{"id": 1, "tipo": "number", "label": "Días de estudio de lección", "orden": 1, "activo": true, "nombre": "dias_estudio", "opciones": null, "createdAt": "2026-01-24T11:36:41.322Z", "requerido": false, "placeholder": "¿Cuántos días estudiaste la lección?", "valorMaximo": 7, "valorMinimo": 0, "tipoAsistenciaId": 1}, {"id": 2, "tipo": "checkbox", "label": "¿Hizo estudio bíblico esta semana?", "orden": 2, "activo": true, "nombre": "estudio_biblico", "opciones": null, "createdAt": "2026-01-24T11:36:41.336Z", "requerido": false, "placeholder": null, "valorMaximo": null, "valorMinimo": null, "tipoAsistenciaId": 1}], "tipoId": 1, "codigoQR": "JAGBQD5G4R", "respuestas": {}, "tipoNombre": "Escuela Sabática", "campoActual": 0}	asistencia	\N	2026-01-31 14:50:19.316	2026-01-31 14:50:18.736	2026-02-01 05:43:23.854	BOT	\N	\N	📝 *Días de estudio de lección*\n_¿Cuántos días estudiaste la lección?_\n_(Valor entre 0 y 7)_	0	\N
\.


--
-- Data for Name: eventos_especiales_config; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public.eventos_especiales_config (id, codigo, nombre, descripcion, puntos, xp, icono, color, activo, created_at, updated_at) FROM stdin;
15	semana_oracion	Semana de Oración	Asistencia a Semana de Oración	8	16	🙏	#7C3AED	t	2026-01-30 23:09:01.763	2026-01-30 23:09:01.763
16	evangelismo	Evangelismo	Participación en jornada de evangelismo	12	24	📢	#EA580C	t	2026-01-30 23:09:01.767	2026-01-30 23:09:01.767
17	proyecto_comunitario	Proyecto Comunitario	Participación en proyecto comunitario	10	20	🤝	#65A30D	t	2026-01-30 23:09:01.771	2026-01-30 23:09:01.771
18	tema_pequeno	Tema en el grupo pequeño	Presentar tema en el grupo pequeño	10	20	📅	#DC2626	t	2026-01-30 23:09:01.775	2026-01-30 23:09:01.775
19	trajo_pequeno	Trajo compartir grupo pequeno	Trajo el compartir en el grupo pequeno	10	20	📅	#DC2626	t	2026-01-30 23:09:01.779	2026-01-30 23:09:01.779
20	presto_casa_pequeno	Presto su casa para el grupo pequeno	Presto su casa para el grupo pequeno	10	20	📅	#DC2626	t	2026-01-30 23:09:01.785	2026-01-30 23:09:01.785
21	donacion_infantil	Donacion semana infantil	Donacion semana infantil	10	20	🙏	#DC2626	t	2026-01-30 23:09:01.789	2026-01-30 23:09:01.789
22	llenado_datos_ja	Llenado de datos ja	Llenado de datos ja	10	20	📅	#DC2626	t	2026-01-30 23:09:01.793	2026-01-30 23:09:01.793
23	participacion_ayuno	Participacion ayuno	Participacion ayuno	10	20	📅	#DC2626	t	2026-01-30 23:09:01.797	2026-01-30 23:09:01.797
24	direccion_escuela_sabatica	Direccion escuela sabatica	Direccion escuela sabatica	10	20	📅	#DC2626	t	2026-01-30 23:09:01.804	2026-01-30 23:09:01.804
25	dia_amistad	Dia de la amistad	Dia de la amistad	10	20	📅	#DC2626	t	2026-01-30 23:09:01.807	2026-01-30 23:09:01.807
77	confraternizacion	Confraternizacion Escuela Sabatica		3	6	🤝	#DB2777	t	2026-01-31 14:45:10.608	2026-01-31 14:45:10.608
1	d13	Día 13	Evangelismo día 13	15	20	📢	#EF4444	t	2026-01-30 22:57:22.824	2026-02-01 14:43:53.536
2	reavivados	Reavivados	Campaña Reavivados	10	15	🔥	#F97316	t	2026-01-30 22:57:22.827	2026-02-01 14:43:53.54
3	semana_santa	Semana Santa	Actividades de Semana Santa	20	30	✝️	#8B5CF6	t	2026-01-30 22:57:22.831	2026-02-01 14:43:53.542
4	campamento	Campamento	Campamento JA	30	50	⛺	#22C55E	t	2026-01-30 22:57:22.833	2026-02-01 14:43:53.546
42	miercoles	Miercoles de Poder		5	10	📅	#2563EB	t	2026-01-31 00:12:01.781	2026-01-31 00:12:01.781
43	asitencia_gp	Asistencia GP		8	16	⛺	#0891B2	t	2026-01-31 00:19:05.847	2026-01-31 00:19:05.847
44	traer_visita	Traer una visita	Traer una visita	3	6	🤝	#0891B2	t	2026-01-31 01:25:37.64	2026-01-31 01:25:37.64
\.


--
-- Data for Name: eventos_especiales_registro; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public.eventos_especiales_registro (id, usuario_gam_id, evento_config_id, fecha, notas, registrado_por_id, created_at) FROM stdin;
1	17	1	2026-01-24	\N	1	2026-01-30 23:42:54.023
2	20	1	2026-01-24	\N	1	2026-01-30 23:42:54.097
3	15	1	2026-01-24	\N	1	2026-01-30 23:42:54.13
4	16	1	2026-01-24	\N	1	2026-01-30 23:42:54.155
5	13	1	2026-01-24	\N	1	2026-01-30 23:45:30.094
6	21	1	2026-01-24	\N	1	2026-01-30 23:45:30.156
7	28	1	2026-01-30	\N	1	2026-01-30 23:56:18.061
9	29	1	2026-01-30	\N	1	2026-01-30 23:57:33.029
10	30	1	2026-01-30	\N	1	2026-01-30 23:57:33.058
11	31	1	2026-01-30	\N	1	2026-01-30 23:57:33.088
12	32	1	2026-01-30	\N	1	2026-01-30 23:57:33.116
13	18	1	2026-01-30	\N	1	2026-01-30 23:57:33.137
14	14	2	2026-01-30	Gano	1	2026-01-30 23:59:00.647
15	29	21	2026-01-30	\N	1	2026-01-31 00:00:48.112
16	36	21	2026-01-30	\N	1	2026-01-31 00:00:48.139
17	18	21	2026-01-30	\N	1	2026-01-31 00:00:48.178
18	15	21	2026-01-30	\N	1	2026-01-31 00:00:48.224
19	13	21	2026-01-30	\N	1	2026-01-31 00:00:48.257
20	38	21	2026-01-30	\N	1	2026-01-31 00:00:48.286
21	20	21	2026-01-30	\N	1	2026-01-31 00:00:48.306
22	19	21	2026-01-30	\N	1	2026-01-31 00:00:48.335
23	39	21	2026-01-30	\N	1	2026-01-31 00:00:48.366
24	40	21	2026-01-30	\N	1	2026-01-31 00:00:48.413
25	41	21	2026-01-30	\N	1	2026-01-31 00:00:48.441
26	42	21	2026-01-30	\N	1	2026-01-31 00:00:48.471
27	43	21	2026-01-30	\N	1	2026-01-31 00:00:48.496
28	44	21	2026-01-30	\N	1	2026-01-31 00:00:48.521
29	22	21	2026-01-30	\N	1	2026-01-31 00:00:48.544
30	41	22	2026-01-30	\N	1	2026-01-31 00:06:28.292
31	18	22	2026-01-30	\N	1	2026-01-31 00:06:28.332
32	15	22	2026-01-30	\N	1	2026-01-31 00:06:28.692
33	38	22	2026-01-30	\N	1	2026-01-31 00:06:28.785
34	46	22	2026-01-30	\N	1	2026-01-31 00:06:28.854
35	16	22	2026-01-30	\N	1	2026-01-31 00:06:29.295
36	40	22	2026-01-30	\N	1	2026-01-31 00:06:29.407
37	22	22	2026-01-30	\N	1	2026-01-31 00:06:29.583
38	20	22	2026-01-30	\N	1	2026-01-31 00:06:29.939
39	14	42	2026-01-28	\N	1	2026-01-31 00:12:35.375
40	16	42	2026-01-28	\N	1	2026-01-31 00:12:35.747
41	22	42	2026-01-28	\N	1	2026-01-31 00:12:35.805
42	36	42	2026-01-28	\N	1	2026-01-31 00:12:35.837
43	14	18	2026-01-23	\N	1	2026-01-31 00:13:03.869
44	14	18	2026-01-16	\N	1	2026-01-31 00:13:13.306
45	13	18	2026-01-09	\N	1	2026-01-31 00:14:15.003
46	16	18	2026-01-09	\N	1	2026-01-31 00:14:15.063
47	13	18	2026-01-02	\N	1	2026-01-31 00:14:22.337
48	28	19	2026-01-09	\N	1	2026-01-31 00:14:49.63
49	13	19	2026-01-09	\N	1	2026-01-31 00:14:49.654
50	21	19	2026-01-16	\N	1	2026-01-31 00:14:58.639
51	20	19	2026-01-23	\N	1	2026-01-31 00:15:13.365
52	16	19	2026-01-23	\N	1	2026-01-31 00:15:13.396
53	47	1	2026-01-30	\N	1	2026-01-31 00:17:56.508
54	16	43	2026-01-23	\N	1	2026-01-31 00:20:05.748
55	15	43	2026-01-23	\N	1	2026-01-31 00:20:05.791
56	14	43	2026-01-23	\N	1	2026-01-31 00:20:05.821
57	45	43	2026-01-23	\N	1	2026-01-31 00:20:05.852
58	20	43	2026-01-23	\N	1	2026-01-31 00:20:05.876
59	32	43	2026-01-23	\N	1	2026-01-31 00:20:05.907
60	13	43	2026-01-23	\N	1	2026-01-31 00:20:05.929
61	16	43	2026-01-16	\N	1	2026-01-31 00:21:14.022
62	21	43	2026-01-16	\N	1	2026-01-31 00:21:14.049
63	45	43	2026-01-16	\N	1	2026-01-31 00:21:14.08
64	17	43	2026-01-16	\N	1	2026-01-31 00:21:14.117
65	14	43	2026-01-16	\N	1	2026-01-31 00:21:14.146
66	38	43	2026-01-16	\N	1	2026-01-31 00:21:14.171
67	18	43	2026-01-16	\N	1	2026-01-31 00:21:14.199
68	22	43	2026-01-16	\N	1	2026-01-31 00:21:14.227
69	36	43	2026-01-16	\N	1	2026-01-31 00:21:14.25
70	13	43	2026-01-09	\N	1	2026-01-31 00:22:10.55
71	32	43	2026-01-09	\N	1	2026-01-31 00:22:10.577
72	15	43	2026-01-09	\N	1	2026-01-31 00:22:10.626
73	17	43	2026-01-09	\N	1	2026-01-31 00:22:10.656
74	45	43	2026-01-09	\N	1	2026-01-31 00:22:10.693
75	16	43	2026-01-09	\N	1	2026-01-31 00:22:10.724
76	38	43	2026-01-09	\N	1	2026-01-31 00:22:10.747
77	28	43	2026-01-09	\N	1	2026-01-31 00:22:10.773
78	21	43	2026-01-09	\N	1	2026-01-31 00:22:10.797
79	43	43	2026-01-09	\N	1	2026-01-31 00:22:10.82
80	21	43	2026-01-02	\N	1	2026-01-31 00:23:40.259
81	16	43	2026-01-02	\N	1	2026-01-31 00:23:40.303
82	13	43	2026-01-02	\N	1	2026-01-31 00:23:40.331
83	23	43	2026-01-02	\N	1	2026-01-31 00:23:40.36
84	36	43	2026-01-02	\N	1	2026-01-31 00:23:40.387
85	38	43	2026-01-02	\N	1	2026-01-31 00:23:40.416
86	39	43	2026-01-02	\N	1	2026-01-31 00:23:40.444
87	40	43	2026-01-02	\N	1	2026-01-31 00:23:40.47
88	17	43	2026-01-02	\N	1	2026-01-31 00:23:40.581
89	15	43	2026-01-02	\N	1	2026-01-31 00:23:40.654
90	38	44	2026-01-30	Jherson trajo una visita 	1	2026-01-31 01:26:08.048
91	38	19	2026-01-30	Trajo compartir 	1	2026-01-31 01:41:19.722
92	14	18	2026-01-30	Quién es Dios tema 	1	2026-01-31 02:01:57.206
94	17	77	2026-01-31	\N	1	2026-01-31 14:45:33.061
95	17	22	2026-01-31	\N	1	2026-01-31 21:46:41.31
96	32	2	2026-01-31	\N	1	2026-01-31 22:41:30.001
\.


--
-- Data for Name: formulario_campos; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public.formulario_campos (id, tipo_asistencia_id, nombre, label, tipo, requerido, orden, placeholder, valor_minimo, valor_maximo, opciones, activo, created_at) FROM stdin;
1	1	dias_estudio	Días de estudio de lección	number	f	1	¿Cuántos días estudiaste la lección?	0	7	\N	t	2026-01-24 11:36:41.322
2	1	estudio_biblico	¿Hizo estudio bíblico esta semana?	checkbox	f	2	\N	\N	\N	\N	t	2026-01-24 11:36:41.336
\.


--
-- Data for Name: grupos_ranking; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public.grupos_ranking (id, codigo, nombre, descripcion, icono, color, tipo, criterio, es_publico, solo_miembros, periodo_id, orden, activo, creado_por_id, created_at, updated_at) FROM stdin;
1	general	Ranking General	Ranking de todos los miembros activos (sin líderes/admin)	🏆	#FACC15	SISTEMA	TODOS_ACTIVOS	t	f	\N	1	t	\N	2026-01-30 22:57:22.033	2026-02-01 14:43:53.554
2	lideres	Ranking Líderes	Ranking exclusivo de líderes y administradores	👑	#8B5CF6	SISTEMA	ROL_LIDER_ADMIN	t	f	\N	2	t	\N	2026-01-30 22:57:22.033	2026-02-01 14:43:53.558
\.


--
-- Data for Name: grupos_ranking_miembros; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public.grupos_ranking_miembros (id, grupo_id, usuario_id, oculto, agregado_por_id, agregado_at) FROM stdin;
\.


--
-- Data for Name: historial_puntos; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public.historial_puntos (id, usuario_gam_id, config_puntaje_id, periodo_ranking_id, puntos, xp, descripcion, fecha, trimestre, anio, referencia_id, referencia_tipo, created_at) FROM stdin;
1	13	3	1	1	2	Asistencia tardia	2026-01-24	\N	\N	1	asistencia	2026-01-30 23:17:16.695
2	14	3	1	1	2	Asistencia tardia	2026-01-24	\N	\N	2	asistencia	2026-01-30 23:17:16.708
3	15	3	1	1	2	Asistencia tardia	2026-01-24	\N	\N	3	asistencia	2026-01-30 23:17:16.721
4	16	3	1	1	2	Asistencia tardia	2026-01-24	\N	\N	6	asistencia	2026-01-30 23:17:16.733
5	17	3	1	1	2	Asistencia tardia	2026-01-24	\N	\N	7	asistencia	2026-01-30 23:17:16.743
6	18	3	1	1	2	Asistencia tardia	2026-01-24	\N	\N	11	asistencia	2026-01-30 23:17:16.752
7	19	3	1	1	2	Asistencia tardia	2026-01-24	\N	\N	12	asistencia	2026-01-30 23:17:16.762
8	20	3	1	1	2	Asistencia tardia	2026-01-24	\N	\N	13	asistencia	2026-01-30 23:17:16.772
9	21	3	1	1	2	Asistencia tardia	2026-01-24	\N	\N	14	asistencia	2026-01-30 23:17:16.781
10	22	3	1	1	2	Asistencia tardia	2026-01-24	\N	\N	15	asistencia	2026-01-30 23:17:16.789
11	23	3	1	1	2	Asistencia tardia	2026-01-24	\N	\N	16	asistencia	2026-01-30 23:17:16.799
12	24	3	1	1	2	Asistencia tardia	2026-01-24	\N	\N	17	asistencia	2026-01-30 23:17:16.808
13	17	\N	1	15	20	Evento: Día 13	2026-01-24	\N	\N	1	evento	2026-01-30 23:42:54.042
14	20	\N	1	15	20	Evento: Día 13	2026-01-24	\N	\N	1	evento	2026-01-30 23:42:54.1
15	15	\N	1	15	20	Evento: Día 13	2026-01-24	\N	\N	1	evento	2026-01-30 23:42:54.133
16	16	\N	1	15	20	Evento: Día 13	2026-01-24	\N	\N	1	evento	2026-01-30 23:42:54.158
17	13	\N	1	15	20	Evento: Día 13	2026-01-24	\N	\N	1	evento	2026-01-30 23:45:30.098
18	21	\N	1	15	20	Evento: Día 13	2026-01-24	\N	\N	1	evento	2026-01-30 23:45:30.16
19	28	\N	1	15	20	Evento: Día 13	2026-01-30	\N	\N	1	evento	2026-01-30 23:56:18.066
21	29	\N	1	15	20	Evento: Día 13	2026-01-30	\N	\N	1	evento	2026-01-30 23:57:33.032
22	30	\N	1	15	20	Evento: Día 13	2026-01-30	\N	\N	1	evento	2026-01-30 23:57:33.06
23	31	\N	1	15	20	Evento: Día 13	2026-01-30	\N	\N	1	evento	2026-01-30 23:57:33.09
24	32	\N	1	15	20	Evento: Día 13	2026-01-30	\N	\N	1	evento	2026-01-30 23:57:33.118
25	18	\N	1	15	20	Evento: Día 13	2026-01-30	\N	\N	1	evento	2026-01-30 23:57:33.139
26	19	\N	1	10	15	Participación: Bienvenida	2026-01-30	\N	\N	33	participacion	2026-01-30 23:58:10.059
27	33	\N	1	10	15	Participación: Bienvenida	2026-01-30	\N	\N	34	participacion	2026-01-30 23:58:10.094
28	19	\N	1	4	6	Participación: Oración Inicial	2026-01-30	\N	\N	35	participacion	2026-01-30 23:58:10.127
29	17	\N	1	5	8	Participación: Espacio de Cantos	2026-01-30	\N	\N	36	participacion	2026-01-30 23:58:10.153
30	20	\N	1	5	8	Participación: Espacio de Cantos	2026-01-30	\N	\N	37	participacion	2026-01-30 23:58:10.189
31	16	\N	1	4	6	Participación: Oración Intercesora	2026-01-30	\N	\N	38	participacion	2026-01-30 23:58:10.225
32	22	\N	1	5	8	Participación: Reavivados	2026-01-30	\N	\N	39	participacion	2026-01-30 23:58:10.25
33	34	\N	1	8	12	Participación: Tema	2026-01-30	\N	\N	40	participacion	2026-01-30 23:58:10.286
34	17	\N	1	3	5	Participación: Himno Final	2026-01-30	\N	\N	41	participacion	2026-01-30 23:58:10.312
35	20	\N	1	3	5	Participación: Himno Final	2026-01-30	\N	\N	42	participacion	2026-01-30 23:58:10.338
36	33	\N	1	4	6	Participación: Oración Final	2026-01-30	\N	\N	43	participacion	2026-01-30 23:58:10.362
37	35	\N	1	10	15	Participación: Bienvenida	2026-01-30	\N	\N	44	participacion	2026-01-30 23:58:15.835
38	36	\N	1	10	15	Participación: Bienvenida	2026-01-30	\N	\N	45	participacion	2026-01-30 23:58:15.868
39	35	\N	1	4	6	Participación: Oración Inicial	2026-01-30	\N	\N	46	participacion	2026-01-30 23:58:15.893
40	16	\N	1	5	8	Participación: Espacio de Cantos	2026-01-30	\N	\N	47	participacion	2026-01-30 23:58:15.924
41	37	\N	1	5	8	Participación: Espacio de Cantos	2026-01-30	\N	\N	48	participacion	2026-01-30 23:58:15.962
42	14	\N	1	4	6	Participación: Oración Intercesora	2026-01-30	\N	\N	49	participacion	2026-01-30 23:58:15.987
43	15	\N	1	5	8	Participación: Reavivados	2026-01-30	\N	\N	50	participacion	2026-01-30 23:58:16.027
44	13	\N	1	8	12	Participación: Tema	2026-01-30	\N	\N	51	participacion	2026-01-30 23:58:16.057
45	16	\N	1	3	5	Participación: Himno Final	2026-01-30	\N	\N	52	participacion	2026-01-30 23:58:16.082
46	37	\N	1	3	5	Participación: Himno Final	2026-01-30	\N	\N	53	participacion	2026-01-30 23:58:16.104
47	36	\N	1	4	6	Participación: Oración Final	2026-01-30	\N	\N	54	participacion	2026-01-30 23:58:16.127
48	14	\N	1	10	15	Evento: Reavivados	2026-01-30	\N	\N	2	evento	2026-01-30 23:59:00.651
49	29	\N	1	10	20	Evento: Donacion semana infantil	2026-01-30	\N	\N	21	evento	2026-01-31 00:00:48.117
50	36	\N	1	10	20	Evento: Donacion semana infantil	2026-01-30	\N	\N	21	evento	2026-01-31 00:00:48.142
51	18	\N	1	10	20	Evento: Donacion semana infantil	2026-01-30	\N	\N	21	evento	2026-01-31 00:00:48.184
52	15	\N	1	10	20	Evento: Donacion semana infantil	2026-01-30	\N	\N	21	evento	2026-01-31 00:00:48.228
53	13	\N	1	10	20	Evento: Donacion semana infantil	2026-01-30	\N	\N	21	evento	2026-01-31 00:00:48.259
54	38	\N	1	10	20	Evento: Donacion semana infantil	2026-01-30	\N	\N	21	evento	2026-01-31 00:00:48.289
55	20	\N	1	10	20	Evento: Donacion semana infantil	2026-01-30	\N	\N	21	evento	2026-01-31 00:00:48.309
56	19	\N	1	10	20	Evento: Donacion semana infantil	2026-01-30	\N	\N	21	evento	2026-01-31 00:00:48.338
57	39	\N	1	10	20	Evento: Donacion semana infantil	2026-01-30	\N	\N	21	evento	2026-01-31 00:00:48.387
58	40	\N	1	10	20	Evento: Donacion semana infantil	2026-01-30	\N	\N	21	evento	2026-01-31 00:00:48.415
59	41	\N	1	10	20	Evento: Donacion semana infantil	2026-01-30	\N	\N	21	evento	2026-01-31 00:00:48.443
60	42	\N	1	10	20	Evento: Donacion semana infantil	2026-01-30	\N	\N	21	evento	2026-01-31 00:00:48.473
61	43	\N	1	10	20	Evento: Donacion semana infantil	2026-01-30	\N	\N	21	evento	2026-01-31 00:00:48.499
62	44	\N	1	10	20	Evento: Donacion semana infantil	2026-01-30	\N	\N	21	evento	2026-01-31 00:00:48.523
63	22	\N	1	10	20	Evento: Donacion semana infantil	2026-01-30	\N	\N	21	evento	2026-01-31 00:00:48.548
64	45	\N	1	10	15	Participación: Bienvenida	2026-01-31	\N	\N	55	participacion	2026-01-31 00:03:13.968
65	38	\N	1	10	15	Participación: Bienvenida	2026-01-31	\N	\N	56	participacion	2026-01-31 00:03:14.008
66	45	\N	1	4	6	Participación: Oración Inicial	2026-01-31	\N	\N	57	participacion	2026-01-31 00:03:14.035
67	20	\N	1	5	8	Participación: Espacio de Cantos	2026-01-31	\N	\N	58	participacion	2026-01-31 00:03:14.059
68	17	\N	1	5	8	Participación: Espacio de Cantos	2026-01-31	\N	\N	59	participacion	2026-01-31 00:03:14.093
69	36	\N	1	4	6	Participación: Oración Intercesora	2026-01-31	\N	\N	60	participacion	2026-01-31 00:03:14.149
70	42	\N	1	5	8	Participación: Reavivados	2026-01-31	\N	\N	61	participacion	2026-01-31 00:03:14.203
71	14	\N	1	8	12	Participación: Tema	2026-01-31	\N	\N	62	participacion	2026-01-31 00:03:14.228
72	20	\N	1	3	5	Participación: Himno Final	2026-01-31	\N	\N	63	participacion	2026-01-31 00:03:14.252
73	17	\N	1	3	5	Participación: Himno Final	2026-01-31	\N	\N	64	participacion	2026-01-31 00:03:14.274
74	38	\N	1	4	6	Participación: Oración Final	2026-01-31	\N	\N	65	participacion	2026-01-31 00:03:14.299
75	20	\N	1	10	15	Participación: Bienvenida	2026-01-31	\N	\N	66	participacion	2026-01-31 00:04:48.943
76	13	\N	1	4	6	Participación: Oración Inicial	2026-01-31	\N	\N	67	participacion	2026-01-31 00:04:48.974
77	38	\N	1	4	6	Participación: Oración Intercesora	2026-01-31	\N	\N	68	participacion	2026-01-31 00:04:48.998
79	16	\N	1	5	8	Participación: Reavivados	2026-01-31	\N	\N	70	participacion	2026-01-31 00:04:49.07
81	41	\N	1	10	20	Evento: Llenado de datos ja	2026-01-30	\N	\N	22	evento	2026-01-31 00:06:28.306
82	18	\N	1	10	20	Evento: Llenado de datos ja	2026-01-30	\N	\N	22	evento	2026-01-31 00:06:28.406
84	38	\N	1	10	20	Evento: Llenado de datos ja	2026-01-30	\N	\N	22	evento	2026-01-31 00:06:28.787
85	46	\N	1	10	20	Evento: Llenado de datos ja	2026-01-30	\N	\N	22	evento	2026-01-31 00:06:29.036
88	22	\N	1	10	20	Evento: Llenado de datos ja	2026-01-30	\N	\N	22	evento	2026-01-31 00:06:29.776
78	13	\N	1	5	8	Participación: Reavivados	2026-01-31	\N	\N	69	participacion	2026-01-31 00:04:49.027
80	14	\N	1	4	6	Participación: Oración Final	2026-01-31	\N	\N	72	participacion	2026-01-31 00:04:49.096
83	15	\N	1	10	20	Evento: Llenado de datos ja	2026-01-30	\N	\N	22	evento	2026-01-31 00:06:28.737
86	16	\N	1	10	20	Evento: Llenado de datos ja	2026-01-30	\N	\N	22	evento	2026-01-31 00:06:29.378
87	40	\N	1	10	20	Evento: Llenado de datos ja	2026-01-30	\N	\N	22	evento	2026-01-31 00:06:29.443
89	20	\N	1	10	20	Evento: Llenado de datos ja	2026-01-30	\N	\N	22	evento	2026-01-31 00:06:30.018
90	14	\N	1	5	10	Evento: Miercoles de Poder	2026-01-28	\N	\N	42	evento	2026-01-31 00:12:35.697
91	16	\N	1	5	10	Evento: Miercoles de Poder	2026-01-28	\N	\N	42	evento	2026-01-31 00:12:35.756
92	22	\N	1	5	10	Evento: Miercoles de Poder	2026-01-28	\N	\N	42	evento	2026-01-31 00:12:35.812
93	36	\N	1	5	10	Evento: Miercoles de Poder	2026-01-28	\N	\N	42	evento	2026-01-31 00:12:35.84
94	14	\N	1	10	20	Evento: Tema en el grupo pequeño	2026-01-23	\N	\N	18	evento	2026-01-31 00:13:03.903
95	14	\N	1	10	20	Evento: Tema en el grupo pequeño	2026-01-16	\N	\N	18	evento	2026-01-31 00:13:13.321
96	13	\N	1	10	20	Evento: Tema en el grupo pequeño	2026-01-09	\N	\N	18	evento	2026-01-31 00:14:15.009
97	16	\N	1	10	20	Evento: Tema en el grupo pequeño	2026-01-09	\N	\N	18	evento	2026-01-31 00:14:15.065
98	13	\N	1	10	20	Evento: Tema en el grupo pequeño	2026-01-02	\N	\N	18	evento	2026-01-31 00:14:22.339
99	28	\N	1	10	20	Evento: Trajo compartir grupo pequeno	2026-01-09	\N	\N	19	evento	2026-01-31 00:14:49.634
100	13	\N	1	10	20	Evento: Trajo compartir grupo pequeno	2026-01-09	\N	\N	19	evento	2026-01-31 00:14:49.656
101	21	\N	1	10	20	Evento: Trajo compartir grupo pequeno	2026-01-16	\N	\N	19	evento	2026-01-31 00:14:58.642
102	20	\N	1	10	20	Evento: Trajo compartir grupo pequeno	2026-01-23	\N	\N	19	evento	2026-01-31 00:15:13.371
103	16	\N	1	10	20	Evento: Trajo compartir grupo pequeno	2026-01-23	\N	\N	19	evento	2026-01-31 00:15:13.4
104	47	\N	1	15	20	Evento: Dicipulo 13	2026-01-30	\N	\N	1	evento	2026-01-31 00:17:56.511
105	16	\N	1	8	16	Evento: Asistencia GP	2026-01-23	\N	\N	43	evento	2026-01-31 00:20:05.753
106	15	\N	1	8	16	Evento: Asistencia GP	2026-01-23	\N	\N	43	evento	2026-01-31 00:20:05.795
107	14	\N	1	8	16	Evento: Asistencia GP	2026-01-23	\N	\N	43	evento	2026-01-31 00:20:05.824
108	45	\N	1	8	16	Evento: Asistencia GP	2026-01-23	\N	\N	43	evento	2026-01-31 00:20:05.855
109	20	\N	1	8	16	Evento: Asistencia GP	2026-01-23	\N	\N	43	evento	2026-01-31 00:20:05.879
110	32	\N	1	8	16	Evento: Asistencia GP	2026-01-23	\N	\N	43	evento	2026-01-31 00:20:05.909
111	13	\N	1	8	16	Evento: Asistencia GP	2026-01-23	\N	\N	43	evento	2026-01-31 00:20:05.931
112	16	\N	1	8	16	Evento: Asistencia GP	2026-01-16	\N	\N	43	evento	2026-01-31 00:21:14.026
113	21	\N	1	8	16	Evento: Asistencia GP	2026-01-16	\N	\N	43	evento	2026-01-31 00:21:14.051
114	45	\N	1	8	16	Evento: Asistencia GP	2026-01-16	\N	\N	43	evento	2026-01-31 00:21:14.085
115	17	\N	1	8	16	Evento: Asistencia GP	2026-01-16	\N	\N	43	evento	2026-01-31 00:21:14.12
116	14	\N	1	8	16	Evento: Asistencia GP	2026-01-16	\N	\N	43	evento	2026-01-31 00:21:14.149
117	38	\N	1	8	16	Evento: Asistencia GP	2026-01-16	\N	\N	43	evento	2026-01-31 00:21:14.174
118	18	\N	1	8	16	Evento: Asistencia GP	2026-01-16	\N	\N	43	evento	2026-01-31 00:21:14.203
119	22	\N	1	8	16	Evento: Asistencia GP	2026-01-16	\N	\N	43	evento	2026-01-31 00:21:14.23
120	36	\N	1	8	16	Evento: Asistencia GP	2026-01-16	\N	\N	43	evento	2026-01-31 00:21:14.252
121	13	\N	1	8	16	Evento: Asistencia GP	2026-01-09	\N	\N	43	evento	2026-01-31 00:22:10.553
122	32	\N	1	8	16	Evento: Asistencia GP	2026-01-09	\N	\N	43	evento	2026-01-31 00:22:10.581
123	15	\N	1	8	16	Evento: Asistencia GP	2026-01-09	\N	\N	43	evento	2026-01-31 00:22:10.629
124	17	\N	1	8	16	Evento: Asistencia GP	2026-01-09	\N	\N	43	evento	2026-01-31 00:22:10.659
125	45	\N	1	8	16	Evento: Asistencia GP	2026-01-09	\N	\N	43	evento	2026-01-31 00:22:10.696
126	16	\N	1	8	16	Evento: Asistencia GP	2026-01-09	\N	\N	43	evento	2026-01-31 00:22:10.726
127	38	\N	1	8	16	Evento: Asistencia GP	2026-01-09	\N	\N	43	evento	2026-01-31 00:22:10.75
128	28	\N	1	8	16	Evento: Asistencia GP	2026-01-09	\N	\N	43	evento	2026-01-31 00:22:10.776
129	21	\N	1	8	16	Evento: Asistencia GP	2026-01-09	\N	\N	43	evento	2026-01-31 00:22:10.8
130	43	\N	1	8	16	Evento: Asistencia GP	2026-01-09	\N	\N	43	evento	2026-01-31 00:22:10.822
131	21	\N	1	8	16	Evento: Asistencia GP	2026-01-02	\N	\N	43	evento	2026-01-31 00:23:40.263
132	16	\N	1	8	16	Evento: Asistencia GP	2026-01-02	\N	\N	43	evento	2026-01-31 00:23:40.305
133	13	\N	1	8	16	Evento: Asistencia GP	2026-01-02	\N	\N	43	evento	2026-01-31 00:23:40.335
134	23	\N	1	8	16	Evento: Asistencia GP	2026-01-02	\N	\N	43	evento	2026-01-31 00:23:40.363
135	36	\N	1	8	16	Evento: Asistencia GP	2026-01-02	\N	\N	43	evento	2026-01-31 00:23:40.39
136	38	\N	1	8	16	Evento: Asistencia GP	2026-01-02	\N	\N	43	evento	2026-01-31 00:23:40.418
137	39	\N	1	8	16	Evento: Asistencia GP	2026-01-02	\N	\N	43	evento	2026-01-31 00:23:40.447
138	40	\N	1	8	16	Evento: Asistencia GP	2026-01-02	\N	\N	43	evento	2026-01-31 00:23:40.485
139	17	\N	1	8	16	Evento: Asistencia GP	2026-01-02	\N	\N	43	evento	2026-01-31 00:23:40.607
140	15	\N	1	8	16	Evento: Asistencia GP	2026-01-02	\N	\N	43	evento	2026-01-31 00:23:40.657
141	18	2	1	3	5	Asistencia Normal	2026-01-31	\N	\N	22	asistencia	2026-01-31 01:03:24.146
142	41	2	1	3	5	Asistencia Normal	2026-01-31	\N	\N	21	asistencia	2026-01-31 01:03:25.112
143	16	2	1	3	5	Asistencia Normal	2026-01-31	\N	\N	20	asistencia	2026-01-31 01:03:25.92
144	36	2	1	3	5	Asistencia Normal	2026-01-31	\N	\N	19	asistencia	2026-01-31 01:03:26.699
145	22	2	1	3	5	Asistencia Normal	2026-01-31	\N	\N	18	asistencia	2026-01-31 01:03:27.453
146	31	2	1	3	5	Asistencia Normal	2026-01-31	\N	\N	23	asistencia	2026-01-31 01:14:02.724
147	14	2	1	3	5	Asistencia Normal	2026-01-31	\N	\N	24	asistencia	2026-01-31 01:14:08.964
148	20	2	1	3	5	Asistencia Normal	2026-01-31	\N	\N	25	asistencia	2026-01-31 01:14:15.097
149	32	2	1	3	5	Asistencia Normal	2026-01-31	\N	\N	26	asistencia	2026-01-31 01:20:06.166
150	38	3	1	1	2	Asistencia Tardía	2026-01-31	\N	\N	27	asistencia	2026-01-31 01:23:44.873
151	38	\N	1	3	6	Evento: Traer una visita	2026-01-30	\N	\N	44	evento	2026-01-31 01:26:08.053
152	28	3	1	1	2	Asistencia Tardía	2026-01-31	\N	\N	29	asistencia	2026-01-31 01:26:32.933
153	38	\N	1	10	20	Evento: Trajo compartir grupo pequeno	2026-01-30	\N	\N	19	evento	2026-01-31 01:41:19.727
154	21	3	1	1	2	Asistencia Tardía	2026-01-31	\N	\N	30	asistencia	2026-01-31 02:01:18.483
155	14	\N	1	10	20	Evento: Tema en el grupo pequeño	2026-01-30	\N	\N	18	evento	2026-01-31 02:01:57.209
157	13	2	1	3	5	Asistencia Normal	2026-01-31	\N	\N	33	asistencia	2026-01-31 08:46:36.967
158	13	1	1	5	8	Asistencia Temprana	2026-01-31	\N	\N	35	asistencia	2026-01-31 14:05:18.279
159	15	1	1	5	8	Asistencia Temprana	2026-01-31	\N	\N	36	asistencia	2026-01-31 14:08:28.008
160	36	2	1	3	5	Asistencia Normal	2026-01-31	\N	\N	37	asistencia	2026-01-31 14:37:47.075
161	18	2	1	3	5	Asistencia Normal	2026-01-31	\N	\N	38	asistencia	2026-01-31 14:40:31.413
162	17	\N	1	3	6	Evento: Confraternizacion Escuela Sabatica	2026-01-31	\N	\N	77	evento	2026-01-31 14:45:33.068
163	34	2	1	3	5	Asistencia Normal	2026-01-31	\N	\N	39	asistencia	2026-01-31 14:48:41.419
164	17	2	1	3	5	Asistencia Normal	2026-01-31	\N	\N	40	asistencia	2026-01-31 14:49:39.195
165	14	2	1	3	5	Asistencia Normal	2026-01-31	\N	\N	41	asistencia	2026-01-31 14:50:11.577
166	16	3	1	1	2	Asistencia Tardía	2026-01-31	\N	\N	45	asistencia	2026-01-31 15:36:14.106
167	31	3	1	1	2	Asistencia Tardía	2026-01-31	\N	\N	47	asistencia	2026-01-31 15:40:00.915
168	17	\N	1	10	20	Evento: Llenado de datos ja	2026-01-31	\N	\N	22	evento	2026-01-31 21:46:41.315
169	32	\N	1	10	15	Evento: Reavivados	2026-01-31	\N	\N	2	evento	2026-01-31 22:41:30.684
170	13	\N	1	10	15	Participación: Bienvenida	2026-02-01	\N	\N	82	participacion	2026-02-01 05:29:32.005
171	37	\N	1	10	15	Participación: Bienvenida	2026-02-01	\N	\N	83	participacion	2026-02-01 05:29:32.036
172	37	\N	1	4	6	Participación: Oración Inicial	2026-02-01	\N	\N	84	participacion	2026-02-01 05:29:32.061
173	14	\N	1	5	8	Participación: Espacio de Cantos	2026-02-01	\N	\N	85	participacion	2026-02-01 05:29:32.085
174	48	\N	1	4	6	Participación: Oración Intercesora	2026-02-01	\N	\N	86	participacion	2026-02-01 05:29:32.118
175	22	\N	1	5	8	Participación: Reavivados	2026-02-01	\N	\N	87	participacion	2026-02-01 05:29:32.142
176	16	\N	1	8	12	Participación: Tema	2026-02-01	\N	\N	88	participacion	2026-02-01 05:29:32.18
177	14	\N	1	3	5	Participación: Himno Final	2026-02-01	\N	\N	89	participacion	2026-02-01 05:29:32.211
178	37	\N	1	4	6	Participación: Oración Final	2026-02-01	\N	\N	90	participacion	2026-02-01 05:29:32.236
\.


--
-- Data for Name: insignias; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public.insignias (id, codigo, nombre, descripcion, icono, color, condicion_tipo, condicion_valor, puntos_bonus, xp_bonus, activo, created_at) FROM stdin;
6	musico	Músico	Participaste en 5 especiales musicales	🎵	#EC4899	participaciones_especial	5	15	25	t	2026-01-30 22:57:21.981
1	madrugador	Madrugador	10 asistencias tempranas	🌅	#F59E0B	asistencias_tempranas	10	10	15	t	2026-01-30 22:57:21.981
2	constante	Constante	Racha de 4 semanas	🔥	#10B981	racha_semanas	4	15	20	t	2026-01-30 22:57:21.981
3	fiel	Fiel	Racha de 12 semanas	💎	#EAB308	racha_semanas	12	50	75	t	2026-01-30 22:57:21.981
10	veterano	Veterano	50 asistencias totales	🎖️	#6366F1	asistencias_totales	50	30	50	t	2026-01-30 22:57:22.813
4	orador	Orador	5 temas centrales	🎤	#8B5CF6	temas_centrales	5	20	30	t	2026-01-30 22:57:21.981
12	director	Director	10 direcciones de programa	🎬	\N	direcciones	10	25	40	t	2026-01-30 22:57:22.82
5	lider	Líder	Dirigir 10 programas	👑	#F97316	direcciones	10	25	50	t	2026-01-30 22:57:21.981
30	melodioso	Melodioso	Participar en 10 especiales	🎵	#EC4899	especiales	10	20	40	t	2026-01-30 23:09:01.739
32	centurion	Centurión	100 asistencias totales	🛡️	#14B8A6	asistencias_totales	100	100	200	t	2026-01-30 23:09:01.748
\.


--
-- Data for Name: mensajes; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public.mensajes (id, conversacion_id, contenido, tipo, metadata, created_at, enviado_por_id, whatsapp_msg_id, estado, leido_at, direccion) FROM stdin;
1	1	Ayuda	texto	{}	2026-01-30 23:25:39.087	\N	wamid.HBgLNTE5NDAzOTM3NTgVAgASGBQzQTgyQzRFNEU2Nzk1MEYwNjFGMgA=	LEIDO	2026-01-31 00:08:38.1	ENTRANTE
2	1	Registrar a Esther Saucedo 900425478	texto	{}	2026-01-30 23:32:55.861	\N	wamid.HBgLNTE5NDAzOTM3NTgVAgASGBQzQUFGODc5MTA2MEEzRUY1MjczRAA=	LEIDO	2026-01-31 00:08:38.1	ENTRANTE
3	1	Programa JA 31 de Enero\nDirección: Jorge y Miguel\nOración Inicial: Miguel\nAlabanzas: José Olivera - Esther Saucedo\n•⁠  ⁠El mejor lugar del mundo - https://www.youtube.com/watch?v=MkCN3NzDhIc\n•⁠  ⁠⁠Oh buen Maestro despierta - https://www.youtube.com/watch?v=QWlOUXfkIE4\n•⁠  ⁠⁠A quien iré - https://www.youtube.com/watch?v=sWLpUbtQ_is\nOración Intercesora: Rubí\nReavivados : Yuxi\n\n- https://create.kahoot.it/share/2-samuel-17-23/7aa70038-e089-4b5b-90c5-5bf5099404e7\n\nTema : Invitado\nRecojo de ofrendas\nCanto Final: José Olivera - Esther Saucedo\n\n- Jesús mi guía es - https://www.youtube.com/watch?v=Th9es6xg_4A\n\nOración Final: Jorge	texto	{}	2026-01-30 23:33:12.648	\N	wamid.HBgLNTE5NDAzOTM3NTgVAgASGBQzQTdEQTUxNEFEMzU3RjlBMDc0RgA=	LEIDO	2026-01-31 00:08:38.1	ENTRANTE
4	1	Registrar Miguel +51 985 235 195	texto	{}	2026-01-30 23:34:11.626	\N	wamid.HBgLNTE5NDAzOTM3NTgVAgASGBQzQUY4NDA3QkNGM0IxNUVBMDJDMAA=	LEIDO	2026-01-31 00:08:38.1	ENTRANTE
5	1	Registrar Rubí +51 924 999 954	texto	{}	2026-01-30 23:35:25.554	\N	wamid.HBgLNTE5NDAzOTM3NTgVAgASGBQzQUIwMzNFMDc3NzFERDlGMThEMQA=	LEIDO	2026-01-31 00:08:38.1	ENTRANTE
10	16	JAWN42SPAR	texto	{}	2026-01-31 01:03:07.583	\N	wamid.HBgLNTE5NzA1MDg2MTQVAgASGCBBQzIyNDQ4QkJDNkJBQkI5MEIzNzU2QjY0QTZEOTQyRAA=	LEIDO	2026-01-31 01:04:03.638	ENTRANTE
12	16	No jugar con el bot porfavor	texto	{}	2026-01-31 01:04:15.505	1	\N	ENVIADO	\N	SALIENTE
11	17	JAWN42SPAR	texto	{}	2026-01-31 01:03:20.694	\N	wamid.HBgLNTE5NjYzODY5MzAVAgASGCBBQzE3QzAyNjQwRUQzMkRERDg2QjQ3RTQ4RjlDQkZFOAA=	LEIDO	2026-01-31 01:30:33.055	ENTRANTE
8	15	JAWN42SPAR	texto	{}	2026-01-31 01:01:52.73	\N	wamid.HBgLNTE5NjIyMzYwNjAVAgASGCBBQzA2MjIyMTY4NjNGRDBBMjdCMzk0MjgwMTAzQjMxQwA=	LEIDO	2026-01-31 01:30:34.803	ENTRANTE
9	5	JAWN42SPAR	texto	{}	2026-01-31 01:02:40.582	\N	wamid.HBgLNTE5OTM4MDMyOTYVAgASGBQzQTQ2Mjc4NUI0NDMxNDIyMDg2NQA=	LEIDO	2026-01-31 01:30:35.905	ENTRANTE
7	14	JAWN42SPAR	texto	{}	2026-01-31 01:01:24.392	\N	wamid.HBgLNTE5MzM3MTQzNjkVAgASGCBBQ0FDNDY0QUEzNTg5QjI5MkM5QTIyMTMxMDI2RkNDNAA=	LEIDO	2026-01-31 01:30:37.393	ENTRANTE
6	1	JAWN42SPAR	texto	{}	2026-01-31 00:16:36.214	\N	wamid.HBgLNTE5NDAzOTM3NTgVAgASGBQzQURDRkE1RjRBNzc3RDVDNEUyNQA=	LEIDO	2026-01-31 01:30:38.813	ENTRANTE
14	10	JAWN42SPAR	texto	{}	2026-01-31 02:50:24.95	\N	wamid.HBgLNTE5Mjc5MzQyOTYVAgASGCBBQzg2QkQ3QjJGNDg5OTkwRjRGODY3RkI0RjNBRkY4MQA=	LEIDO	2026-01-31 02:57:17.638	ENTRANTE
15	10	Noooooo	texto	{}	2026-01-31 02:50:41.003	\N	wamid.HBgLNTE5Mjc5MzQyOTYVAgASGCBBQ0QxQjUyNTg4MjMxQjc1RDVDNjFGRDY4OEY5QzU3MgA=	LEIDO	2026-01-31 02:57:17.638	ENTRANTE
16	10	Ayuda	texto	{}	2026-01-31 02:50:51.437	\N	wamid.HBgLNTE5Mjc5MzQyOTYVAgASGCBBQzAxNzJGQjI5N0M3NTcxQTlBN0RGMjU0MTgyN0VFMQA=	LEIDO	2026-01-31 02:57:17.638	ENTRANTE
17	10	Nop	texto	{}	2026-01-31 02:51:23.627	\N	wamid.HBgLNTE5Mjc5MzQyOTYVAgASGCBBQzY2QUFFMjk3NDQyNkM0MUMzMkI2MjI2OUJBREE1NAA=	LEIDO	2026-01-31 02:57:17.638	ENTRANTE
13	2	JAWN42SPAR	texto	{}	2026-01-31 02:42:37.736	\N	wamid.HBgLNTE5OTYxNjA1NjYVAgASGCBBQzJBN0U2MTI0QUU2NTkwOTY4RjczNUExOENFOEQ5QQA=	LEIDO	2026-01-31 02:59:10.25	ENTRANTE
18	1	JABK5P39TC	texto	{}	2026-01-31 13:48:28.072	\N	wamid.HBgLNTE5NDAzOTM3NTgVAgASGBQzQThBMEM0QTE3QTc0NTBFNTI1OQA=	ENVIADO	\N	ENTRANTE
19	1	⏰ El registro de asistencia solo está disponible de 09:00 a 15:00.	bot	{}	2026-01-31 13:48:28.83	\N	\N	ENVIADO	\N	SALIENTE
20	1	JABK5P39TC	texto	{}	2026-01-31 13:51:21.253	\N	wamid.HBgLNTE5NDAzOTM3NTgVAgASGBQzQjc2Qjg5NUIzNkJFOTE2NDYzQgA=	ENVIADO	\N	ENTRANTE
21	1	⏰ El registro de asistencia solo está disponible de 09:00 a 15:00.	bot	{}	2026-01-31 13:51:21.737	\N	\N	ENVIADO	\N	SALIENTE
22	1	JABK5P39TC	texto	{}	2026-01-31 13:51:43.813	\N	wamid.HBgLNTE5NDAzOTM3NTgVAgASGBQzQUJCQ0Y5MzVERDc0NjUzNkQyRQA=	ENVIADO	\N	ENTRANTE
23	1	⏰ El registro de asistencia solo está disponible de 09:00 a 15:00.	bot	{}	2026-01-31 13:51:44.166	\N	\N	ENVIADO	\N	SALIENTE
24	1	JABK5P39TC	texto	{}	2026-01-31 14:03:30.389	\N	wamid.HBgLNTE5NDAzOTM3NTgVAgASGBQzQThGMkYyREMyRThBMjNFODQ2OQA=	ENVIADO	\N	ENTRANTE
25	1	✅ *¡Asistencia registrada!*\n\n📋 Programa JA\n👤 Jorge Luis Vasquez\n📅 31/1/2026\n\n¡Dios te bendiga! 🙏	bot	{}	2026-01-31 14:03:30.917	\N	\N	ENVIADO	\N	SALIENTE
26	1	JAGBQD5G4R	texto	{}	2026-01-31 14:04:57.244	\N	wamid.HBgLNTE5NDAzOTM3NTgVAgASGBQzQUIwODQxRDk1RkJEMzA1NTA4NwA=	ENVIADO	\N	ENTRANTE
27	1	¡Hola Jorge Luis Vasquez! 👋	bot	{}	2026-01-31 14:04:57.554	\N	\N	ENVIADO	\N	SALIENTE
28	1	Para *Escuela Sabática* necesito algunos datos:	bot	{}	2026-01-31 14:04:58.606	\N	\N	ENVIADO	\N	SALIENTE
29	1	📝 *Días de estudio de lección*\n_¿Cuántos días estudiaste la lección?_\n_(Valor entre 0 y 7)_	bot	{}	2026-01-31 14:04:59.721	\N	\N	ENVIADO	\N	SALIENTE
30	1	4	texto	{}	2026-01-31 14:05:05.319	\N	wamid.HBgLNTE5NDAzOTM3NTgVAgASGBQzQTgwQzZDMDhGRTA0NTZBQjJGMgA=	ENVIADO	\N	ENTRANTE
31	1	📝 *¿Hizo estudio bíblico esta semana?*\n_(Responde "sí" o "no")_	bot	{}	2026-01-31 14:05:05.727	\N	\N	ENVIADO	\N	SALIENTE
32	1	no	texto	{}	2026-01-31 14:05:09.912	\N	wamid.HBgLNTE5NDAzOTM3NTgVAgASGBQzQUVGNEQ0NTNFQ0Y5RTU5MEQzMwA=	ENVIADO	\N	ENTRANTE
33	1	✅ *¡Asistencia registrada!*\n\n📋 Escuela Sabática\n👤 Jorge Luis Vasquez\n📅 31/1/2026\n\n📝 *Datos registrados:*\n   • dias_estudio: 4\n   • estudio_biblico: false\n\n¡Dios te bendiga! 🙏	bot	{}	2026-01-31 14:05:10.218	\N	\N	ENVIADO	\N	SALIENTE
34	3	JAGBQD5G4R	texto	{}	2026-01-31 14:06:25.262	\N	wamid.HBgLNTE5NjM4OTUwNjEVAgASGBQzQUI2NUZCNjU5Q0Y0QTk4NkE0MAA=	ENVIADO	\N	ENTRANTE
35	3	¡Hola Fanny Calderon! 👋	bot	{}	2026-01-31 14:06:25.871	\N	\N	ENVIADO	\N	SALIENTE
36	3	Para *Escuela Sabática* necesito algunos datos:	bot	{}	2026-01-31 14:06:27.072	\N	\N	ENVIADO	\N	SALIENTE
37	3	📝 *Días de estudio de lección*\n_¿Cuántos días estudiaste la lección?_\n_(Valor entre 0 y 7)_	bot	{}	2026-01-31 14:06:28.206	\N	\N	ENVIADO	\N	SALIENTE
38	3	7	texto	{}	2026-01-31 14:06:36.195	\N	wamid.HBgLNTE5NjM4OTUwNjEVAgASGBQzQTg1MUU3NzA3REQyNkE4MTZDNwA=	ENVIADO	\N	ENTRANTE
39	3	📝 *¿Hizo estudio bíblico esta semana?*\n_(Responde "sí" o "no")_	bot	{}	2026-01-31 14:06:36.653	\N	\N	ENVIADO	\N	SALIENTE
40	3	No	texto	{}	2026-01-31 14:06:45.115	\N	wamid.HBgLNTE5NjM4OTUwNjEVAgASGBQzQURDMzUzNkM1QjZFQzIyMjRGNAA=	ENVIADO	\N	ENTRANTE
41	3	✅ *¡Asistencia registrada!*\n\n📋 Escuela Sabática\n👤 Fanny Calderon\n📅 31/1/2026\n\n📝 *Datos registrados:*\n   • dias_estudio: 7\n   • estudio_biblico: false\n\n¡Dios te bendiga! 🙏	bot	{}	2026-01-31 14:06:45.45	\N	\N	ENVIADO	\N	SALIENTE
43	15	¡Hola Gobernaba en aquel tiempo! 👋	bot	{}	2026-01-31 14:20:56.787	\N	\N	ENVIADO	\N	SALIENTE
44	15	Para *Escuela Sabática* necesito algunos datos:	bot	{}	2026-01-31 14:20:57.912	\N	\N	ENVIADO	\N	SALIENTE
45	15	📝 *Días de estudio de lección*\n_¿Cuántos días estudiaste la lección?_\n_(Valor entre 0 y 7)_	bot	{}	2026-01-31 14:20:58.942	\N	\N	ENVIADO	\N	SALIENTE
47	15	📝 *¿Hizo estudio bíblico esta semana?*\n_(Responde "sí" o "no")_	bot	{}	2026-01-31 14:21:12.437	\N	\N	ENVIADO	\N	SALIENTE
49	15	✅ *¡Asistencia registrada!*\n\n📋 Escuela Sabática\n👤 Gobernaba en aquel tiempo\n📅 31/1/2026\n\n📝 *Datos registrados:*\n   • dias_estudio: 7\n   • estudio_biblico: false\n\n¡Dios te bendiga! 🙏	bot	{}	2026-01-31 14:21:24.339	\N	\N	ENVIADO	\N	SALIENTE
51	8	¡Hola Niki! 👋	bot	{}	2026-01-31 14:48:46.545	\N	\N	ENVIADO	\N	SALIENTE
52	8	Para *Escuela Sabática* necesito algunos datos:	bot	{}	2026-01-31 14:48:47.761	\N	\N	ENVIADO	\N	SALIENTE
53	8	📝 *Días de estudio de lección*\n_¿Cuántos días estudiaste la lección?_\n_(Valor entre 0 y 7)_	bot	{}	2026-01-31 14:48:48.825	\N	\N	ENVIADO	\N	SALIENTE
55	8	📝 *¿Hizo estudio bíblico esta semana?*\n_(Responde "sí" o "no")_	bot	{}	2026-01-31 14:48:56.252	\N	\N	ENVIADO	\N	SALIENTE
57	18	¡Hola Minka Electrónics! 👋	bot	{}	2026-01-31 14:48:56.74	\N	\N	ENVIADO	\N	SALIENTE
58	18	Para *Escuela Sabática* necesito algunos datos:	bot	{}	2026-01-31 14:48:57.946	\N	\N	ENVIADO	\N	SALIENTE
59	18	📝 *Días de estudio de lección*\n_¿Cuántos días estudiaste la lección?_\n_(Valor entre 0 y 7)_	bot	{}	2026-01-31 14:48:59.017	\N	\N	ENVIADO	\N	SALIENTE
61	18	⚠️ Por favor ingresa un número válido.	bot	{}	2026-01-31 14:49:00.609	\N	\N	ENVIADO	\N	SALIENTE
63	8	✅ *¡Asistencia registrada!*\n\n📋 Escuela Sabática\n👤 Niki\n📅 31/1/2026\n\n📝 *Datos registrados:*\n   • dias_estudio: 7\n   • estudio_biblico: false\n\n¡Dios te bendiga! 🙏	bot	{}	2026-01-31 14:49:01.608	\N	\N	ENVIADO	\N	SALIENTE
65	2	¡Hola moyjose25! 👋	bot	{}	2026-01-31 14:49:29.515	\N	\N	ENVIADO	\N	SALIENTE
66	2	Para *Escuela Sabática* necesito algunos datos:	bot	{}	2026-01-31 14:49:30.77	\N	\N	ENVIADO	\N	SALIENTE
67	2	📝 *Días de estudio de lección*\n_¿Cuántos días estudiaste la lección?_\n_(Valor entre 0 y 7)_	bot	{}	2026-01-31 14:49:32.22	\N	\N	ENVIADO	\N	SALIENTE
69	2	📝 *¿Hizo estudio bíblico esta semana?*\n_(Responde "sí" o "no")_	bot	{}	2026-01-31 14:49:41.283	\N	\N	ENVIADO	\N	SALIENTE
71	2	✅ *¡Asistencia registrada!*\n\n📋 Escuela Sabática\n👤 moyjose25\n📅 31/1/2026\n\n📝 *Datos registrados:*\n   • dias_estudio: 7\n   • estudio_biblico: false\n\n¡Dios te bendiga! 🙏	bot	{}	2026-01-31 14:49:48.467	\N	\N	ENVIADO	\N	SALIENTE
73	19	¡Hola IMPORTACIONES CUSI! 👋	bot	{}	2026-01-31 14:50:19.322	\N	\N	ENVIADO	\N	SALIENTE
75	19	Para *Escuela Sabática* necesito algunos datos:	bot	{}	2026-01-31 14:50:20.38	\N	\N	ENVIADO	\N	SALIENTE
76	19	⚠️ Por favor ingresa un número válido.	bot	{}	2026-01-31 14:50:20.581	\N	\N	ENVIADO	\N	SALIENTE
77	19	📝 *Días de estudio de lección*\n_¿Cuántos días estudiaste la lección?_\n_(Valor entre 0 y 7)_	bot	{}	2026-01-31 14:50:21.558	\N	\N	ENVIADO	\N	SALIENTE
79	20	¡Hola Carlos Arturo! 👋	bot	{}	2026-01-31 15:32:32.545	\N	\N	ENVIADO	\N	SALIENTE
80	20	Para *Escuela Sabática* necesito algunos datos:	bot	{}	2026-01-31 15:32:33.786	\N	\N	ENVIADO	\N	SALIENTE
81	20	📝 *Días de estudio de lección*\n_¿Cuántos días estudiaste la lección?_\n_(Valor entre 0 y 7)_	bot	{}	2026-01-31 15:32:35.043	\N	\N	ENVIADO	\N	SALIENTE
83	20	📝 *¿Hizo estudio bíblico esta semana?*\n_(Responde "sí" o "no")_	bot	{}	2026-01-31 15:32:49.067	\N	\N	ENVIADO	\N	SALIENTE
85	20	✅ *¡Asistencia registrada!*\n\n📋 Escuela Sabática\n👤 Carlos Arturo\n📅 31/1/2026\n\n📝 *Datos registrados:*\n   • dias_estudio: 7\n   • estudio_biblico: false\n\n¡Dios te bendiga! 🙏	bot	{}	2026-01-31 15:33:24.054	\N	\N	ENVIADO	\N	SALIENTE
87	5	¡Hola Anyela💖! 👋	bot	{}	2026-01-31 15:34:33.486	\N	\N	ENVIADO	\N	SALIENTE
88	5	Para *Escuela Sabática* necesito algunos datos:	bot	{}	2026-01-31 15:34:34.671	\N	\N	ENVIADO	\N	SALIENTE
89	5	📝 *Días de estudio de lección*\n_¿Cuántos días estudiaste la lección?_\n_(Valor entre 0 y 7)_	bot	{}	2026-01-31 15:34:35.833	\N	\N	ENVIADO	\N	SALIENTE
91	5	📝 *¿Hizo estudio bíblico esta semana?*\n_(Responde "sí" o "no")_	bot	{}	2026-01-31 15:34:42.589	\N	\N	ENVIADO	\N	SALIENTE
93	5	✅ *¡Asistencia registrada!*\n\n📋 Escuela Sabática\n👤 Anyela💖\n📅 31/1/2026\n\n📝 *Datos registrados:*\n   • dias_estudio: 6\n   • estudio_biblico: true\n\n¡Dios te bendiga! 🙏	bot	{}	2026-01-31 15:35:07.354	\N	\N	ENVIADO	\N	SALIENTE
95	6	¡Hola Almendra Solórzano Chang! 👋	bot	{}	2026-01-31 15:35:23.795	\N	\N	ENVIADO	\N	SALIENTE
96	6	Para *Escuela Sabática* necesito algunos datos:	bot	{}	2026-01-31 15:35:24.972	\N	\N	ENVIADO	\N	SALIENTE
97	6	📝 *Días de estudio de lección*\n_¿Cuántos días estudiaste la lección?_\n_(Valor entre 0 y 7)_	bot	{}	2026-01-31 15:35:26.083	\N	\N	ENVIADO	\N	SALIENTE
99	6	📝 *¿Hizo estudio bíblico esta semana?*\n_(Responde "sí" o "no")_	bot	{}	2026-01-31 15:35:33.076	\N	\N	ENVIADO	\N	SALIENTE
94	6	JAGBQD5G4R	texto	{}	2026-01-31 15:35:23.154	\N	wamid.HBgLNTE5OTQwNjg5NjcVAgASGCBBQ0FEQzZDMzBFN0M3NzFGMEFDNzUzN0Y1RjI1QkQ5MwA=	LEIDO	2026-01-31 17:17:05.775	ENTRANTE
72	19	JAGBQD5G4R	texto	{}	2026-01-31 14:50:18.755	\N	wamid.HBgLNTE5MzY3NTM3NzIVAgASGCBBNTBGRDgxMDA4MDg3MTA4OTcyOUZBMEMwRkMwMjNERAA=	LEIDO	2026-01-31 17:17:26.535	ENTRANTE
74	19	Hola	texto	{}	2026-01-31 14:50:20.208	\N	wamid.HBgLNTE5MzY3NTM3NzIVAgASGCBBNUE5NDdFQUY4MjgzRjRGN0NEMEY0MDFCNENDRTMwMgA=	LEIDO	2026-01-31 17:17:26.535	ENTRANTE
56	18	JAGBQD5G4R	texto	{}	2026-01-31 14:48:56.439	\N	wamid.HBgLNTE5MjIyODE4MDIVAgASGCBBNTZCREQ3RURGQTQ0NkExNDAzRDgwRDQ3NUEzRTE2MAA=	LEIDO	2026-01-31 17:17:39.021	ENTRANTE
48	15	No	texto	{}	2026-01-31 14:21:23.837	\N	wamid.HBgLNTE5NjIyMzYwNjAVAgASGCBBQzUxREE1RDg2NDY2QzFCNzBBMzgzOTk3MkFDN0JEQwA=	LEIDO	2026-01-31 17:17:49.546	ENTRANTE
50	8	JAGBQD5G4R	texto	{}	2026-01-31 14:48:45.908	\N	wamid.HBgLNTE5OTAxMzQxMzIVAgASGBQzQTEyMUVDRDk0QTFDNTc4RTc3OQA=	LEIDO	2026-01-31 17:17:59.143	ENTRANTE
54	8	7	texto	{}	2026-01-31 14:48:55.676	\N	wamid.HBgLNTE5OTAxMzQxMzIVAgASGBQzQUNDRTExREJDOTQ1MTI4RDE5RQA=	LEIDO	2026-01-31 17:17:59.143	ENTRANTE
64	2	JAGBQD5G4R	texto	{}	2026-01-31 14:49:28.824	\N	wamid.HBgLNTE5OTYxNjA1NjYVAgASGCBBQzhFN0Q5NjlDQjRBRTg1MzEzOTlDMDM3MjZENTYxQwA=	LEIDO	2026-01-31 17:18:00.875	ENTRANTE
68	2	7	texto	{}	2026-01-31 14:49:40.746	\N	wamid.HBgLNTE5OTYxNjA1NjYVAgASGCBBQ0QwNDZGNkIxRDJFN0VDMjdDQUEwQUQ1MkFDOTU1MQA=	LEIDO	2026-01-31 17:18:00.875	ENTRANTE
70	2	No	texto	{}	2026-01-31 14:49:47.977	\N	wamid.HBgLNTE5OTYxNjA1NjYVAgASGCBBQ0E2NThFQTdERkI3NzQwRUU1MTBBNkZCN0YzNzY0QwA=	LEIDO	2026-01-31 17:18:00.875	ENTRANTE
78	20	JAGBQD5G4R	texto	{}	2026-01-31 15:32:31.882	\N	wamid.HBgLNTE5NjkzMzcyODQVAgASGBQzQTA0QUI2Q0QzOTMzRTk0OEFFNgA=	LEIDO	2026-01-31 17:18:07.745	ENTRANTE
82	20	7	texto	{}	2026-01-31 15:32:48.572	\N	wamid.HBgLNTE5NjkzMzcyODQVAgASGBQzQTNFNUI1Qjc1ODBGNjY2QURCQgA=	LEIDO	2026-01-31 17:18:07.745	ENTRANTE
86	5	JAGBQD5G4R	texto	{}	2026-01-31 15:34:32.824	\N	wamid.HBgLNTE5OTM4MDMyOTYVAgASGBQzQTM0QkMyNTNGOUEyOThERDIzRgA=	LEIDO	2026-01-31 17:18:09.94	ENTRANTE
90	5	6	texto	{}	2026-01-31 15:34:42.189	\N	wamid.HBgLNTE5OTM4MDMyOTYVAgASGBQzQTk5MTgzQ0Q0OEJEQzc0QTVDOQA=	LEIDO	2026-01-31 17:18:09.94	ENTRANTE
92	5	Si	texto	{}	2026-01-31 15:35:06.795	\N	wamid.HBgLNTE5OTM4MDMyOTYVAgASGBQzQTY3MzRCRTc4MEVCNEQwNTIyMgA=	LEIDO	2026-01-31 17:18:09.94	ENTRANTE
98	6	1	texto	{}	2026-01-31 15:35:32.574	\N	wamid.HBgLNTE5OTQwNjg5NjcVAgASGCBBQzU2NTI0RENGRDEyQThGNDBFOTdEQzQ5RkQzNjZDOAA=	LEIDO	2026-01-31 17:17:05.775	ENTRANTE
60	18	Hola 👋	texto	{}	2026-01-31 14:49:00.364	\N	wamid.HBgLNTE5MjIyODE4MDIVAgASGCBBNTU4N0FFQzBCN0VERkY3MDIwMzc2MDQ5QjE1QjhENQA=	LEIDO	2026-01-31 17:17:39.021	ENTRANTE
42	15	JAGBQD5G4R	texto	{}	2026-01-31 14:20:56.169	\N	wamid.HBgLNTE5NjIyMzYwNjAVAgASGCBBQ0U0MDgzNDdFNDkxMUE2QTA4RjlDNjNBNUY5NkJEQwA=	LEIDO	2026-01-31 17:17:49.546	ENTRANTE
46	15	7	texto	{}	2026-01-31 14:21:11.922	\N	wamid.HBgLNTE5NjIyMzYwNjAVAgASGCBBQzhBRDlCOTlFMzE1OTUzREJDQzFFMDczM0UzODg1NwA=	LEIDO	2026-01-31 17:17:49.546	ENTRANTE
62	8	No	texto	{}	2026-01-31 14:49:01.285	\N	wamid.HBgLNTE5OTAxMzQxMzIVAgASGBQzQTUzREQ4MkE5QzY3MkI3REM1NgA=	LEIDO	2026-01-31 17:17:59.143	ENTRANTE
84	20	No	texto	{}	2026-01-31 15:33:23.536	\N	wamid.HBgLNTE5NjkzMzcyODQVAgASGBQzQTMzQUZGQzQxMjAxMzZBOUQ1MQA=	LEIDO	2026-01-31 17:18:07.745	ENTRANTE
101	21	📋 *Programa JA*\n🔖 Código: PJEG86C2\n📅 sábado, 31 de enero\n📊 Estado: enviado\n\n*Bienvenida:* Jorge Vasquez, Miguel\n*Oración Inicial:* Miguel\n*Espacio de Cantos:* Jose Olivera, Esther Saucedo\n• El mejor lugar del mundo: https://www.youtube.com/watch?v=MkCN3NzDhIc\n• Oh buen Maestro despierta: https://www.youtube.com/watch?v=QWlOUXfkIE4\n• A quien iré: https://www.youtube.com/watch?v=sWLpUbtQ_is\n*Oración Intercesora:* Rubi\n*Reavivados:* Yuxy\n• Kahoot: https://create.kahoot.it/share/2-samuel-17-23/7aa70038-e089-4b5b-90c5-5bf5099404e7\n*Tema:* Invitado\n*Recojo de Ofrendas:* Diáconos\n*Himno Final:* Jose Olivera, Esther Saucedo\n• Jesús mi guía es: https://www.youtube.com/watch?v=Th9es6xg_4A\n*Oración Final:* Jorge Vasquez\n	bot	{}	2026-01-31 17:52:47.208	\N	\N	ENVIADO	\N	SALIENTE
103	21	¡Hola Alicia! 👋\n\n¿En qué puedo ayudarte?\n\nEscribe *ayuda* para ver los comandos disponibles.	bot	{}	2026-01-31 17:53:02.149	\N	\N	ENVIADO	\N	SALIENTE
100	21	ver programa PJEG86C2	texto	{}	2026-01-31 17:52:46.6	\N	wamid.HBgLNTE5MDA0MjU0NzgVAgASGCBBNUYxNjk3RjE5MTdEMkM0NEI2QUI3OTE1QTI0OUUzMwA=	LEIDO	2026-01-31 18:56:36.527	ENTRANTE
102	21	Gracias	texto	{}	2026-01-31 17:52:59.785	\N	wamid.HBgLNTE5MDA0MjU0NzgVAgASGCBBNTE4MEVEQjdBRUNGNTk5OUI0OTg0QTg0RUVGMEM1MAA=	LEIDO	2026-01-31 18:56:36.527	ENTRANTE
\.


--
-- Data for Name: niveles_biblicos; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public.niveles_biblicos (id, numero, nombre, descripcion, xp_requerido, icono, color, activo, created_at) FROM stdin;
55	1	Discípulo	Inicio del camino de fe	0	📖	#9CA3AF	t	2026-01-30 23:09:01.586
56	2	Creyente	Servidor fiel	100	🙏	#60A5FA	t	2026-01-30 23:09:01.594
57	3	Adorador	Guía espiritual	300	🎵	#34D399	t	2026-01-30 23:09:01.598
58	4	Testigo	Ministro del templo	600	🌟	#FBBF24	t	2026-01-30 23:09:01.601
59	5	Siervo	Mediador ante Dios	1000	🤲	#F87171	t	2026-01-30 23:09:01.604
60	6	Líder	Portavoz divino	1500	🦁	#A78BFA	t	2026-01-30 23:09:01.607
61	7	Pastor	Enviado con misión	2200	🐑	#FB923C	t	2026-01-30 23:09:01.611
62	8	Profeta	Proclamador del evangelio	3000	🔥	#EC4899	t	2026-01-30 23:09:01.615
63	9	Apóstol	Guardián celestial	4000	⚡	#8B5CF6	t	2026-01-30 23:09:01.619
64	10	Serafín	En la presencia de Dios	5500	👼	#FACC15	t	2026-01-30 23:09:01.638
\.


--
-- Data for Name: notificaciones; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public.notificaciones (id, usuario_id, telefono, tipo, mensaje, programa_id, estado, enviado_at, error_mensaje, created_at) FROM stdin;
\.


--
-- Data for Name: partes; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public.partes (id, nombre, descripcion, orden, es_fija, texto_fijo, activo, created_at, es_obligatoria, puntos, xp) FROM stdin;
1	Bienvenida	\N	1	f	\N	t	2026-01-24 11:36:07.988	t	10	15
2	Oración Inicial	\N	2	f	\N	t	2026-01-24 11:36:07.999	t	4	6
3	Espacio de Cantos	\N	3	f	\N	t	2026-01-24 11:36:08.008	t	5	8
4	Oración Intercesora	\N	4	f	\N	t	2026-01-24 11:36:08.018	f	4	6
5	Reavivados	\N	5	f	\N	t	2026-01-24 11:36:08.026	f	5	8
6	Tema	\N	6	f	\N	t	2026-01-24 11:36:08.037	t	8	12
7	Notijoven	\N	7	f	\N	t	2026-01-24 11:36:08.043	f	4	6
8	Dinámica	\N	8	f	\N	t	2026-01-24 11:36:08.052	f	5	8
9	Testimonio	\N	9	f	\N	t	2026-01-24 11:36:08.061	f	5	8
10	Especial	\N	10	f	\N	t	2026-01-24 11:36:08.068	f	6	10
11	Recojo de Ofrendas	\N	11	t	Diáconos	t	2026-01-24 11:36:08.077	t	0	0
12	Himno Final	\N	12	f	\N	t	2026-01-24 11:36:08.087	t	3	5
13	Oración Final	\N	13	f	\N	t	2026-01-24 11:36:08.094	t	4	6
\.


--
-- Data for Name: periodos_ranking; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public.periodos_ranking (id, nombre, descripcion, fecha_inicio, fecha_fin, estado, creado_por_id, cerrado_at, cerrado_por_id, resultados_json, created_at, updated_at) FROM stdin;
1	Q1 2026	Primer trimestre 2026 (Enero - Marzo)	2026-01-01	2026-03-31	ACTIVO	1	\N	\N	\N	2026-01-30 22:57:22.837	2026-01-30 22:57:22.837
\.


--
-- Data for Name: programa_asignaciones; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public.programa_asignaciones (id, programa_id, parte_id, usuario_id, orden, notificado, notificado_at, confirmado, confirmado_at, created_at, nombre_libre) FROM stdin;
33	2	1	9	1	f	\N	f	\N	2026-01-30 23:54:50.894	\N
34	2	1	30	2	f	\N	f	\N	2026-01-30 23:54:50.91	\N
35	2	2	9	1	f	\N	f	\N	2026-01-30 23:54:50.923	\N
36	2	3	28	1	f	\N	f	\N	2026-01-30 23:54:50.937	\N
37	2	3	19	2	f	\N	f	\N	2026-01-30 23:54:50.95	\N
38	2	4	7	1	f	\N	f	\N	2026-01-30 23:54:50.968	\N
39	2	5	10	1	f	\N	f	\N	2026-01-30 23:54:51.002	\N
40	2	6	452	1	f	\N	f	\N	2026-01-30 23:54:51.016	\N
41	2	12	28	1	f	\N	f	\N	2026-01-30 23:54:51.031	\N
42	2	12	19	2	f	\N	f	\N	2026-01-30 23:54:51.048	\N
43	2	13	30	1	f	\N	f	\N	2026-01-30 23:54:51.064	\N
44	3	1	2	1	f	\N	f	\N	2026-01-30 23:55:58.311	\N
45	3	1	3	2	f	\N	f	\N	2026-01-30 23:55:58.314	\N
46	3	2	2	1	f	\N	f	\N	2026-01-30 23:55:58.317	\N
47	3	3	7	1	f	\N	f	\N	2026-01-30 23:55:58.319	\N
48	3	3	456	2	f	\N	f	\N	2026-01-30 23:55:58.322	\N
49	3	4	23	1	f	\N	f	\N	2026-01-30 23:55:58.324	\N
50	3	5	26	1	f	\N	f	\N	2026-01-30 23:55:58.327	\N
51	3	6	1	1	f	\N	f	\N	2026-01-30 23:55:58.329	\N
52	3	12	7	1	f	\N	f	\N	2026-01-30 23:55:58.332	\N
53	3	12	456	2	f	\N	f	\N	2026-01-30 23:55:58.335	\N
54	3	13	3	1	f	\N	f	\N	2026-01-30 23:55:58.337	\N
55	4	1	12	1	f	\N	f	\N	2026-01-31 00:03:01.394	\N
56	4	1	16	2	f	\N	f	\N	2026-01-31 00:03:01.401	\N
57	4	2	12	1	f	\N	f	\N	2026-01-31 00:03:01.407	\N
58	4	3	19	1	f	\N	f	\N	2026-01-31 00:03:01.412	\N
59	4	3	28	2	f	\N	f	\N	2026-01-31 00:03:01.417	\N
60	4	4	3	1	f	\N	f	\N	2026-01-31 00:03:01.42	\N
61	4	5	4	1	f	\N	f	\N	2026-01-31 00:03:01.426	\N
62	4	6	23	1	f	\N	f	\N	2026-01-31 00:03:01.43	\N
63	4	12	19	1	f	\N	f	\N	2026-01-31 00:03:01.434	\N
64	4	12	28	2	f	\N	f	\N	2026-01-31 00:03:01.438	\N
65	4	13	16	1	f	\N	f	\N	2026-01-31 00:03:01.441	\N
66	5	1	19	1	f	\N	f	\N	2026-01-31 00:04:39.835	\N
67	5	2	1	1	f	\N	f	\N	2026-01-31 00:04:39.837	\N
68	5	4	16	1	f	\N	f	\N	2026-01-31 00:04:39.841	\N
69	5	5	1	1	f	\N	f	\N	2026-01-31 00:04:39.843	\N
70	5	5	7	2	f	\N	f	\N	2026-01-31 00:04:39.845	\N
71	5	6	\N	1	f	\N	f	\N	2026-01-31 00:04:39.847	Over
72	5	13	23	1	f	\N	f	\N	2026-01-31 00:04:39.85	\N
82	1	1	1	1	f	\N	f	\N	2026-02-01 05:29:23.136	\N
83	1	1	456	2	f	\N	f	\N	2026-02-01 05:29:23.139	\N
84	1	2	456	1	f	\N	f	\N	2026-02-01 05:29:23.144	\N
85	1	3	23	1	f	\N	f	\N	2026-02-01 05:29:23.148	\N
86	1	4	457	1	f	\N	f	\N	2026-02-01 05:29:23.151	\N
87	1	5	10	1	f	\N	f	\N	2026-02-01 05:29:23.155	\N
88	1	6	7	1	f	\N	f	\N	2026-02-01 05:29:23.158	\N
89	1	12	23	1	f	\N	f	\N	2026-02-01 05:29:23.161	\N
90	1	13	456	1	f	\N	f	\N	2026-02-01 05:29:23.166	\N
\.


--
-- Data for Name: programa_links; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public.programa_links (id, programa_id, parte_id, nombre, url, orden, agregado_por, created_at) FROM stdin;
21	1	3	El mejor lugar del mundo	https://www.youtube.com/watch?v=MkCN3NzDhIc	1	\N	2026-02-01 05:29:23.173
22	1	3	Oh buen Maestro despierta	https://www.youtube.com/watch?v=QWlOUXfkIE4	2	\N	2026-02-01 05:29:23.177
23	1	3	A quien iré	https://www.youtube.com/watch?v=sWLpUbtQ_is	3	\N	2026-02-01 05:29:23.18
24	1	5	Kahoot	https://create.kahoot.it/share/2-samuel-17-23/7aa70038-e089-4b5b-90c5-5bf5099404e7	1	\N	2026-02-01 05:29:23.183
25	1	12	Jesús mi guía es	https://www.youtube.com/watch?v=Th9es6xg_4A	1	\N	2026-02-01 05:29:23.186
\.


--
-- Data for Name: programa_partes; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public.programa_partes (id, programa_id, parte_id, orden, created_at) FROM stdin;
28	2	1	1	2026-01-30 23:54:50.789
29	2	2	2	2026-01-30 23:54:50.797
30	2	3	3	2026-01-30 23:54:50.806
31	2	4	4	2026-01-30 23:54:50.814
32	2	5	5	2026-01-30 23:54:50.826
33	2	6	6	2026-01-30 23:54:50.844
34	2	11	7	2026-01-30 23:54:50.857
35	2	12	8	2026-01-30 23:54:50.871
36	2	13	9	2026-01-30 23:54:50.879
37	3	1	1	2026-01-30 23:55:58.264
38	3	2	2	2026-01-30 23:55:58.268
39	3	3	3	2026-01-30 23:55:58.271
40	3	4	4	2026-01-30 23:55:58.274
41	3	5	5	2026-01-30 23:55:58.276
42	3	6	6	2026-01-30 23:55:58.279
43	3	11	7	2026-01-30 23:55:58.282
44	3	12	8	2026-01-30 23:55:58.306
45	3	13	9	2026-01-30 23:55:58.308
46	4	1	1	2026-01-31 00:03:01.354
47	4	2	2	2026-01-31 00:03:01.36
48	4	3	3	2026-01-31 00:03:01.365
49	4	4	4	2026-01-31 00:03:01.368
50	4	5	5	2026-01-31 00:03:01.372
51	4	6	6	2026-01-31 00:03:01.376
52	4	11	7	2026-01-31 00:03:01.379
53	4	12	8	2026-01-31 00:03:01.383
54	4	13	9	2026-01-31 00:03:01.389
55	5	1	1	2026-01-31 00:04:39.807
56	5	2	2	2026-01-31 00:04:39.813
57	5	3	3	2026-01-31 00:04:39.817
58	5	4	4	2026-01-31 00:04:39.82
59	5	5	5	2026-01-31 00:04:39.823
60	5	6	6	2026-01-31 00:04:39.827
61	5	11	7	2026-01-31 00:04:39.829
62	5	12	8	2026-01-31 00:04:39.831
63	5	13	9	2026-01-31 00:04:39.833
73	1	1	1	2026-02-01 05:29:23.112
74	1	2	2	2026-02-01 05:29:23.115
75	1	3	3	2026-02-01 05:29:23.118
76	1	4	4	2026-02-01 05:29:23.12
77	1	5	5	2026-02-01 05:29:23.122
78	1	6	6	2026-02-01 05:29:23.124
79	1	11	7	2026-02-01 05:29:23.126
80	1	12	8	2026-02-01 05:29:23.128
81	1	13	9	2026-02-01 05:29:23.13
\.


--
-- Data for Name: programas; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public.programas (id, fecha, titulo, estado, texto_generado, creado_por, enviado_at, created_at, updated_at, codigo, hora_inicio, hora_fin) FROM stdin;
1	2026-01-31	Programa JA	finalizado	Programa Maranatha Adoración el sábado *31/01/2026*:\n\n*Bienvenida:* Jorge Vasquez, Miguel\n*Oración Inicial:* Miguel\n*Espacio de Cantos:* Jose Olivera, Esther Saucedo\n• El mejor lugar del mundo: https://www.youtube.com/watch?v=MkCN3NzDhIc\n• Oh buen Maestro despierta: https://www.youtube.com/watch?v=QWlOUXfkIE4\n• A quien iré: https://www.youtube.com/watch?v=sWLpUbtQ_is\n*Oración Intercesora:* Rubi\n*Reavivados:* Yuxy\n• Kahoot: https://create.kahoot.it/share/2-samuel-17-23/7aa70038-e089-4b5b-90c5-5bf5099404e7\n*Tema:* Invitado\n*Recojo de Ofrendas:* Diáconos\n*Himno Final:* Jose Olivera, Esther Saucedo\n• Jesús mi guía es: https://www.youtube.com/watch?v=Th9es6xg_4A\n*Oración Final:* Jorge Vasquez\n	1	2026-01-31 17:51:25.447	2026-01-30 23:33:28.078	2026-02-01 05:29:32.257	PJEG86C2	\N	\N
2	2026-01-24	Programa Maranatha Adoración	finalizado	\N	1	\N	2026-01-30 23:54:50.763	2026-01-30 23:58:10.382	PMACZJ6TU	\N	\N
3	2026-01-17	Programa Maranatha Adoración	finalizado	\N	1	\N	2026-01-30 23:55:58.26	2026-01-30 23:58:16.143	PMAJEVHHM	\N	\N
4	2026-01-10	Programa Maranatha Adoración	finalizado	\N	1	\N	2026-01-31 00:03:01.349	2026-01-31 00:03:14.321	PMAV4QBHY	\N	\N
5	2026-01-03	Programa Maranatha Adoración	finalizado	\N	1	\N	2026-01-31 00:04:39.797	2026-01-31 00:04:49.129	PMA858KKT	\N	\N
\.


--
-- Data for Name: qr_asistencia; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public.qr_asistencia (id, semana_inicio, codigo, descripcion, url_generada, activo, hora_inicio, hora_fin, created_by, created_at, tipo_id, margen_temprana, margen_tardia) FROM stdin;
1	2026-01-24	JA5394949A	prueba	/asistencia/JA-5394949A	t	05:00:00	23:00:00	1	2026-01-24 11:40:22.269	1	15	30
2	2026-01-30	JAWN42SPAR	\N	/asistencia/JAWN42SPAR	t	00:50:00	03:00:00	1	2026-01-30 23:31:36.392	3	15	30
4	2026-01-31	JAGBQD5G4R	\N	/asistencia/JAGBQD5G4R	t	14:20:00	04:00:00	1	2026-01-31 14:04:21.817	1	20	30
\.


--
-- Data for Name: roles; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public.roles (id, nombre, descripcion, created_at) FROM stdin;
1	admin	Administrador del sistema - puede todo	2026-01-24 11:36:07.832
2	lider	Líder JA - puede armar programas y ver reportes	2026-01-24 11:36:07.834
3	participante	Miembro del grupo - participa en programas	2026-01-24 11:36:07.834
\.


--
-- Data for Name: tipos_asistencia; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public.tipos_asistencia (id, nombre, label, descripcion, icono, color, solo_presencia, activo, orden, created_at, updated_at) FROM stdin;
3	gp	Grupo Pequeño	Registro de asistencia a Grupo Pequeño	Home	#F59E0B	t	t	3	2026-01-24 11:36:41.352	2026-02-01 14:43:53.461
1	escuela_sabatica	Escuela Sabática	Registro de asistencia a Escuela Sabática	BookOpen	#3B82F6	f	t	1	2026-01-24 11:36:41.303	2026-02-01 14:43:53.452
2	programa_ja	Programa JA	Registro de asistencia a Programa de Jóvenes Adventistas	Users	#10B981	t	t	2	2026-01-24 11:36:41.342	2026-02-01 14:43:53.458
\.


--
-- Data for Name: usuarios; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public.usuarios (id, codigo_pais, telefono, password_hash, nombre, nombre_whatsapp, email, activo, debe_cambiar_password, ultimo_login, created_at, updated_at, foto_url, fecha_nacimiento, direccion, biografia, genero, recibir_notificaciones_whatsapp, notificar_nuevas_conversaciones, modo_handoff_default, participa_en_ranking, es_ja) FROM stdin;
16	51	994727249	$2b$10$YcefUPYpjDmmtm7EAnjSIuvqalR0SpwvaUOcEmkQvm8/RhYfS7.Ka	Jherson Flores	\N	\N	t	t	\N	2026-01-24 11:36:40.835	2026-02-01 14:43:53.352	\N	\N	\N	\N	\N	t	t	AMBOS	t	t
456	51	985235195	$2b$10$N2BLiclnSGnC5v5SYRDCVu1K1b3Xks.F2E.Wm/DAJbve6.YZoQ7/2	Miguel	\N	\N	t	t	\N	2026-01-30 23:34:14.616	2026-01-31 08:11:14.623	\N	\N	\N	\N	\N	t	t	AMBOS	t	f
20	51	993211474	$2b$10$YcefUPYpjDmmtm7EAnjSIuvqalR0SpwvaUOcEmkQvm8/RhYfS7.Ka	Milli	\N	\N	t	t	\N	2026-01-24 11:36:40.955	2026-02-01 14:43:53.377	\N	\N	\N	\N	\N	t	t	AMBOS	t	t
28	51	990134132	$2b$10$YcefUPYpjDmmtm7EAnjSIuvqalR0SpwvaUOcEmkQvm8/RhYfS7.Ka	Nicol Castro	\N	\N	t	t	2026-01-31 21:57:23.051	2026-01-24 11:36:41.166	2026-02-01 14:43:53.422	\N	\N	\N	\N	\N	t	t	AMBOS	t	t
6	51	963033161	$2b$10$YcefUPYpjDmmtm7EAnjSIuvqalR0SpwvaUOcEmkQvm8/RhYfS7.Ka	Ruth Diaz	\N	\N	t	t	\N	2026-01-24 11:36:40.541	2026-02-01 14:43:53.284	\N	\N	\N	\N	\N	t	t	AMBOS	t	t
457	51	924999954	$2b$10$WVPqXbsZxaFrCMJ/3M/1teup5Jgea8253FjSOTihBTOMKPFxS2nIW	Rubi	\N	\N	t	t	\N	2026-01-30 23:35:28.715	2026-01-30 23:35:57.223	\N	\N	\N	\N	\N	t	t	AMBOS	t	t
24	51	997170847	$2b$10$YcefUPYpjDmmtm7EAnjSIuvqalR0SpwvaUOcEmkQvm8/RhYfS7.Ka	Fernanda Quinto	\N	\N	t	t	\N	2026-01-24 11:36:41.059	2026-02-01 14:43:53.401	\N	\N	\N	\N	\N	t	t	AMBOS	t	t
2	51	928801948	$2b$10$YcefUPYpjDmmtm7EAnjSIuvqalR0SpwvaUOcEmkQvm8/RhYfS7.Ka	Damaris	\N	\N	t	t	\N	2026-01-24 11:36:40.424	2026-02-01 14:43:53.257	\N	\N	\N	\N	\N	t	t	AMBOS	t	t
7	51	993803296	$2b$10$YcefUPYpjDmmtm7EAnjSIuvqalR0SpwvaUOcEmkQvm8/RhYfS7.Ka	Anyela Calle	\N	\N	t	t	2026-01-31 21:47:55.563	2026-01-24 11:36:40.569	2026-02-01 14:43:53.29	\N	2000-10-13	\N	\N	\N	t	t	AMBOS	t	t
12	51	949125725	$2b$10$YcefUPYpjDmmtm7EAnjSIuvqalR0SpwvaUOcEmkQvm8/RhYfS7.Ka	Liz Delgado	\N	\N	t	t	\N	2026-01-24 11:36:40.709	2026-02-01 14:43:53.325	\N	\N	\N	\N	\N	t	t	AMBOS	t	t
17	51	966750219	$2b$10$YcefUPYpjDmmtm7EAnjSIuvqalR0SpwvaUOcEmkQvm8/RhYfS7.Ka	Milca Humpiri	\N	\N	t	t	\N	2026-01-24 11:36:40.866	2026-02-01 14:43:53.359	\N	2000-09-14	\N	\N	\N	t	t	AMBOS	t	t
25	51	975662737	$2b$10$YcefUPYpjDmmtm7EAnjSIuvqalR0SpwvaUOcEmkQvm8/RhYfS7.Ka	Zelo	\N	\N	t	t	\N	2026-01-24 11:36:41.085	2026-02-01 14:43:53.407	\N	2000-04-18	\N	\N	\N	t	t	AMBOS	t	t
21	51	951360200	$2b$10$YcefUPYpjDmmtm7EAnjSIuvqalR0SpwvaUOcEmkQvm8/RhYfS7.Ka	Irene	\N	\N	t	t	\N	2026-01-24 11:36:40.981	2026-02-01 14:43:53.382	\N	\N	\N	\N	\N	t	t	AMBOS	t	t
9	51	984121155	$2b$10$YcefUPYpjDmmtm7EAnjSIuvqalR0SpwvaUOcEmkQvm8/RhYfS7.Ka	Pamela Maldonado	\N	\N	t	t	\N	2026-01-24 11:36:40.623	2026-02-01 14:43:53.305	\N	2000-07-02	\N	\N	\N	t	t	AMBOS	t	f
10	51	933714369	$2b$10$YcefUPYpjDmmtm7EAnjSIuvqalR0SpwvaUOcEmkQvm8/RhYfS7.Ka	Belen Diaz	\N	\N	t	t	\N	2026-01-24 11:36:40.651	2026-02-01 14:43:53.311	\N	2000-10-09	\N	\N	\N	t	t	AMBOS	t	f
32	51	902098838	$2b$10$YcefUPYpjDmmtm7EAnjSIuvqalR0SpwvaUOcEmkQvm8/RhYfS7.Ka	Gretel Chavez	\N	\N	t	t	\N	2026-01-24 11:36:41.278	2026-02-01 14:43:53.445	\N	2000-04-16	\N	\N	\N	t	t	AMBOS	t	t
3	51	962236060	$2b$10$YcefUPYpjDmmtm7EAnjSIuvqalR0SpwvaUOcEmkQvm8/RhYfS7.Ka	Elizabhet Bolaños	\N	\N	t	t	\N	2026-01-24 11:36:40.459	2026-02-01 14:43:53.266	\N	\N	\N	\N	\N	t	t	AMBOS	t	t
29	51	976203046	$2b$10$YcefUPYpjDmmtm7EAnjSIuvqalR0SpwvaUOcEmkQvm8/RhYfS7.Ka	Xavier	\N	\N	t	t	\N	2026-01-24 11:36:41.193	2026-02-01 14:43:53.428	\N	\N	\N	\N	\N	t	t	AMBOS	t	t
13	51	991157405	$2b$10$YcefUPYpjDmmtm7EAnjSIuvqalR0SpwvaUOcEmkQvm8/RhYfS7.Ka	Carla Delgado	\N	\N	t	t	\N	2026-01-24 11:36:40.735	2026-02-01 14:43:53.334	\N	\N	\N	\N	\N	t	t	AMBOS	t	t
30	51	954764679	$2b$10$YcefUPYpjDmmtm7EAnjSIuvqalR0SpwvaUOcEmkQvm8/RhYfS7.Ka	Lucia	\N	\N	t	t	\N	2026-01-24 11:36:41.218	2026-02-01 14:43:53.433	\N	\N	\N	\N	\N	t	t	AMBOS	t	f
11	51	945388949	$2b$10$YcefUPYpjDmmtm7EAnjSIuvqalR0SpwvaUOcEmkQvm8/RhYfS7.Ka	Renzo Higinio	\N	\N	t	t	\N	2026-01-24 11:36:40.678	2026-02-01 14:43:53.317	\N	\N	\N	\N	\N	t	t	AMBOS	t	t
22	51	932722857	$2b$10$YcefUPYpjDmmtm7EAnjSIuvqalR0SpwvaUOcEmkQvm8/RhYfS7.Ka	Diego Bendezu	\N	\N	t	t	\N	2026-01-24 11:36:41.005	2026-02-01 14:43:53.388	\N	2000-06-29	\N	\N	\N	t	t	AMBOS	t	t
452	51	944469639	$2b$10$tpyeOomaSM48R9pVRWvU0uiZIY5UzFMtMxHpQ6DNH7h/H3EAzgIqu	Juan Carlos	\N	\N	t	t	\N	2026-01-30 23:30:04.129	2026-01-30 23:30:04.129	\N	\N	\N	\N	\N	t	t	AMBOS	t	t
4	51	957679148	$2b$10$YcefUPYpjDmmtm7EAnjSIuvqalR0SpwvaUOcEmkQvm8/RhYfS7.Ka	Piedad Rivera	\N	\N	t	t	\N	2026-01-24 11:36:40.487	2026-02-01 14:43:53.273	\N	\N	\N	\N	\N	t	t	AMBOS	t	f
8	51	970508614	$2b$10$YcefUPYpjDmmtm7EAnjSIuvqalR0SpwvaUOcEmkQvm8/RhYfS7.Ka	Bryan Chavez	\N	\N	t	t	\N	2026-01-24 11:36:40.593	2026-02-01 14:43:53.298	\N	\N	\N	\N	\N	t	t	AMBOS	t	t
453	51	970332361	$2b$10$izjV0qZho14k7GvqvN3J0uMFuZKrYjNrFmIMtk0PiYysLNTPKK4Mu	William	\N	\N	t	t	\N	2026-01-30 23:30:11.213	2026-01-30 23:30:11.213	\N	\N	\N	\N	\N	t	t	AMBOS	t	t
14	51	991018759	$2b$10$YcefUPYpjDmmtm7EAnjSIuvqalR0SpwvaUOcEmkQvm8/RhYfS7.Ka	Kelly Delgado	\N	\N	t	t	\N	2026-01-24 11:36:40.774	2026-02-01 14:43:53.339	\N	\N	\N	\N	\N	t	t	AMBOS	t	f
454	51	994068967	$2b$10$mXfD5/wFHk3FhMXGuSI0k.Mj3fdOcC3G2cSWW4Ju5GZgP0TDPqghO	Almendra Solórzano Chang	\N	\N	t	t	\N	2026-01-30 23:30:22.876	2026-01-30 23:30:22.876	\N	\N	\N	\N	\N	t	t	AMBOS	t	t
18	51	951212662	$2b$10$YcefUPYpjDmmtm7EAnjSIuvqalR0SpwvaUOcEmkQvm8/RhYfS7.Ka	Gina Mamani	\N	\N	t	t	\N	2026-01-24 11:36:40.897	2026-02-01 14:43:53.365	\N	2000-09-06	\N	\N	\N	t	t	AMBOS	t	t
1	51	940393758	$2b$10$YcefUPYpjDmmtm7EAnjSIuvqalR0SpwvaUOcEmkQvm8/RhYfS7.Ka	Jorge Vasquez	\N	\N	t	f	2026-02-01 05:28:43.318	2026-01-24 11:36:40.378	2026-02-01 14:43:53.247	\N	2000-06-15	\N	\N	\N	t	t	AMBOS	t	t
23	51	996160566	$2b$10$YcefUPYpjDmmtm7EAnjSIuvqalR0SpwvaUOcEmkQvm8/RhYfS7.Ka	Jose Olivera	\N	\N	t	t	\N	2026-01-24 11:36:41.033	2026-02-01 14:43:53.393	\N	2026-02-16	\N	\N	\N	t	t	AMBOS	t	t
455	51	900425478	$2b$10$1CFiTF0VtKNM6pq8YA0qVe/n83n4q0SU3Nzzjqlv7rXIwgza4zdmq	Esther Saucedo	\N	\N	t	t	\N	2026-01-30 23:32:56.327	2026-01-30 23:32:56.327	\N	\N	\N	\N	\N	t	t	AMBOS	t	t
5	51	932287482	$2b$10$YcefUPYpjDmmtm7EAnjSIuvqalR0SpwvaUOcEmkQvm8/RhYfS7.Ka	Jean Caso	\N	\N	t	t	\N	2026-01-24 11:36:40.511	2026-02-01 14:43:53.278	\N	2000-04-07	\N	\N	\N	t	t	AMBOS	t	t
19	51	927934296	$2b$10$YcefUPYpjDmmtm7EAnjSIuvqalR0SpwvaUOcEmkQvm8/RhYfS7.Ka	Patricia Tola	\N	\N	t	t	\N	2026-01-24 11:36:40.929	2026-02-01 14:43:53.371	\N	2000-05-13	\N	\N	\N	t	t	AMBOS	t	t
449	51	978612876	$2b$10$lc/2GRIaIF/Zi4kxbu589OOQDapDrFT7S3mmQHzied2UtwR2Gj1tO	Jhefren Espino Roman	\N	\N	t	t	\N	2026-01-30 23:18:04.202	2026-01-30 23:18:04.202	\N	2000-10-06	\N	\N	\N	t	t	AMBOS	t	t
450	51	965045963	$2b$10$lc/2GRIaIF/Zi4kxbu589OOQDapDrFT7S3mmQHzied2UtwR2Gj1tO	Dany Quezada	\N	\N	t	t	\N	2026-01-30 23:18:04.219	2026-01-30 23:18:04.219	\N	2000-12-30	\N	\N	\N	t	t	AMBOS	t	t
451	51	902318278	$2b$10$lc/2GRIaIF/Zi4kxbu589OOQDapDrFT7S3mmQHzied2UtwR2Gj1tO	Antonio Peña	\N	\N	t	t	\N	2026-01-30 23:18:04.23	2026-01-30 23:18:04.23	\N	2000-11-20	\N	\N	\N	t	t	AMBOS	t	t
26	51	963895061	$2b$10$YcefUPYpjDmmtm7EAnjSIuvqalR0SpwvaUOcEmkQvm8/RhYfS7.Ka	Fanny Calderon	\N	\N	t	t	\N	2026-01-24 11:36:41.115	2026-02-01 14:43:53.412	\N	2000-07-31	\N	\N	\N	t	t	AMBOS	t	t
15	51	987622613	$2b$10$YcefUPYpjDmmtm7EAnjSIuvqalR0SpwvaUOcEmkQvm8/RhYfS7.Ka	Cristhian Ramirez	\N	\N	t	t	\N	2026-01-24 11:36:40.808	2026-02-01 14:43:53.346	\N	\N	\N	\N	\N	t	t	AMBOS	t	t
27	51	966386930	$2b$10$YcefUPYpjDmmtm7EAnjSIuvqalR0SpwvaUOcEmkQvm8/RhYfS7.Ka	Yuxy	\N	\N	t	t	\N	2026-01-24 11:36:41.139	2026-02-01 14:43:53.417	\N	\N	\N	\N	\N	t	t	AMBOS	t	t
31	51	939494403	$2b$10$YcefUPYpjDmmtm7EAnjSIuvqalR0SpwvaUOcEmkQvm8/RhYfS7.Ka	Alex	\N	\N	t	t	\N	2026-01-24 11:36:41.245	2026-02-01 14:43:53.439	\N	\N	\N	\N	\N	t	t	AMBOS	t	t
\.


--
-- Data for Name: usuarios_gamificacion; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public.usuarios_gamificacion (id, usuario_id, puntos_total, puntos_trimestre, xp_total, nivel_id, racha_actual, racha_mejor, ultima_semana_asistio, asistencias_totales, participaciones_totales, oculto_en_general, created_at, updated_at) FROM stdin;
45	12	38	38	69	55	0	0	\N	0	2	f	2026-01-31 00:03:13.958	2026-01-31 00:22:10.699
29	17	25	25	40	55	0	0	\N	0	0	f	2026-01-30 23:57:33.021	2026-01-31 00:00:48.121
31	450	19	19	27	55	1	1	2026-01-25	2	0	f	2026-01-30 23:57:33.08	2026-01-31 15:40:00.958
43	20	18	18	36	55	0	0	\N	0	0	f	2026-01-31 00:00:48.491	2026-01-31 00:22:10.825
17	28	72	72	127	56	0	0	2026-01-25	2	4	f	2026-01-30 23:17:16.74	2026-01-31 21:46:41.32
32	449	44	44	72	55	1	1	2026-01-30	1	0	f	2026-01-30 23:57:33.111	2026-01-31 22:41:31.226
13	1	115	115	204	56	2	2	2026-01-25	3	4	f	2026-01-30 23:17:16.688	2026-02-01 05:29:32.009
35	2	14	14	21	55	0	0	\N	0	2	f	2026-01-30 23:58:15.831	2026-01-30 23:58:15.895
21	5	51	51	92	55	1	1	2026-01-30	2	0	f	2026-01-30 23:17:16.778	2026-01-31 02:01:18.514
48	457	4	4	6	55	0	0	\N	0	1	f	2026-02-01 05:29:32.111	2026-02-01 05:29:32.12
22	10	47	47	89	55	1	1	2026-01-30	2	2	f	2026-01-30 23:17:16.787	2026-02-01 05:29:32.145
19	9	25	25	43	55	0	0	2026-01-24	1	2	f	2026-01-30 23:17:16.759	2026-01-31 00:00:48.34
23	32	9	9	18	55	0	0	2026-01-24	1	0	f	2026-01-30 23:17:16.796	2026-01-31 00:23:40.365
39	14	18	18	36	55	0	0	\N	0	0	f	2026-01-31 00:00:48.359	2026-01-31 00:23:40.45
16	7	112	112	202	56	1	1	2026-01-25	3	5	f	2026-01-30 23:17:16.73	2026-02-01 05:29:32.183
40	15	28	28	56	55	0	0	\N	0	0	f	2026-01-31 00:00:48.407	2026-01-31 00:23:40.532
44	13	10	10	20	55	0	0	\N	0	0	f	2026-01-31 00:00:48.516	2026-01-31 00:00:48.525
14	23	92	92	166	56	1	1	2026-01-25	3	5	f	2026-01-30 23:17:16.704	2026-02-01 05:29:32.214
37	456	26	26	40	55	0	0	\N	0	5	f	2026-01-30 23:58:15.957	2026-02-01 05:29:32.239
24	25	1	1	2	55	0	0	2026-01-24	1	0	f	2026-01-30 23:17:16.806	2026-01-30 23:17:16.811
47	451	15	15	20	55	0	0	\N	0	0	f	2026-01-31 00:17:56.497	2026-01-31 00:17:56.514
30	454	15	15	20	55	0	0	2026-01-24	0	0	f	2026-01-30 23:57:33.052	2026-01-30 23:57:33.063
41	8	23	23	45	55	1	1	2026-01-30	1	0	f	2026-01-31 00:00:48.435	2026-01-31 01:03:25.15
33	30	14	14	21	55	0	0	\N	0	2	f	2026-01-30 23:58:10.089	2026-01-30 23:58:10.365
42	4	15	15	28	55	0	0	\N	0	1	f	2026-01-31 00:00:48.465	2026-01-31 00:03:14.207
20	19	83	83	144	56	1	1	2026-01-30	2	5	f	2026-01-30 23:17:16.769	2026-01-31 01:14:15.122
28	22	34	34	58	55	1	1	2026-01-30	1	0	f	2026-01-30 23:56:18.049	2026-01-31 01:26:32.96
38	16	76	76	143	56	1	1	2026-01-30	1	3	f	2026-01-31 00:00:48.28	2026-01-31 01:41:19.732
46	21	10	10	20	55	0	0	\N	0	0	f	2026-01-31 00:06:28.815	2026-01-31 00:06:29.087
15	26	70	70	126	56	0	0	2026-01-25	2	1	f	2026-01-30 23:17:16.717	2026-01-31 14:08:28.111
36	3	55	55	99	55	1	1	2026-01-25	2	3	f	2026-01-30 23:58:15.863	2026-01-31 14:37:47.11
18	27	50	50	88	55	1	1	2026-01-25	3	0	f	2026-01-30 23:17:16.75	2026-01-31 14:40:31.438
34	452	11	11	17	55	0	0	2026-01-25	1	1	f	2026-01-30 23:58:10.281	2026-01-31 14:48:41.448
\.


--
-- Data for Name: usuarios_insignias; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public.usuarios_insignias (id, usuario_gam_id, insignia_id, desbloqueada_at, notificado) FROM stdin;
\.


--
-- Data for Name: usuarios_partes; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public.usuarios_partes (id, usuario_id, parte_id, ultima_participacion, total_participaciones, created_at) FROM stdin;
\.


--
-- Data for Name: usuarios_roles; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public.usuarios_roles (id, usuario_id, rol_id, asignado_por, created_at) FROM stdin;
2	2	3	\N	2026-01-24 11:36:40.441
3	3	3	\N	2026-01-24 11:36:40.472
5	5	3	\N	2026-01-24 11:36:40.527
6	6	3	\N	2026-01-24 11:36:40.551
8	8	3	\N	2026-01-24 11:36:40.608
11	11	3	\N	2026-01-24 11:36:40.691
13	13	3	\N	2026-01-24 11:36:40.747
15	15	3	\N	2026-01-24 11:36:40.821
16	16	3	\N	2026-01-24 11:36:40.85
17	17	3	\N	2026-01-24 11:36:40.88
18	18	3	\N	2026-01-24 11:36:40.91
19	19	3	\N	2026-01-24 11:36:40.942
20	20	3	\N	2026-01-24 11:36:40.965
21	21	3	\N	2026-01-24 11:36:40.992
24	24	3	\N	2026-01-24 11:36:41.07
25	25	3	\N	2026-01-24 11:36:41.097
27	27	3	\N	2026-01-24 11:36:41.153
29	29	3	\N	2026-01-24 11:36:41.204
31	31	3	\N	2026-01-24 11:36:41.263
33	449	3	\N	2026-01-30 23:18:04.211
34	450	3	\N	2026-01-30 23:18:04.224
35	451	3	\N	2026-01-30 23:18:04.235
41	1	1	\N	2026-01-30 23:29:28.43
42	452	3	1	2026-01-30 23:30:04.146
43	453	3	1	2026-01-30 23:30:11.218
44	454	3	1	2026-01-30 23:30:22.882
45	455	3	\N	2026-01-30 23:32:56.332
48	457	3	\N	2026-01-30 23:35:57.23
53	22	3	\N	2026-01-30 23:42:03.376
54	14	3	\N	2026-01-31 08:10:10.087
55	30	3	\N	2026-01-31 08:10:42.169
56	456	3	\N	2026-01-31 08:11:14.641
57	32	3	\N	2026-01-31 08:27:00.264
59	26	2	\N	2026-01-31 08:27:16.698
61	12	2	\N	2026-01-31 08:27:57.033
63	12	3	\N	2026-01-31 08:43:16.52
65	26	3	\N	2026-01-31 08:43:16.605
66	4	3	\N	2026-01-31 14:59:18.957
67	9	3	\N	2026-01-31 14:59:29.069
68	10	3	\N	2026-01-31 14:59:43.738
69	28	3	\N	2026-01-31 21:40:18.028
72	23	2	\N	2026-01-31 21:55:01.353
73	7	1	\N	2026-01-31 21:55:17.318
74	7	3	\N	2026-02-01 14:43:53.294
75	23	3	\N	2026-02-01 14:43:53.397
\.


--
-- Name: asistencias_id_seq; Type: SEQUENCE SET; Schema: public; Owner: postgres
--

SELECT pg_catalog.setval('public.asistencias_id_seq', 47, true);


--
-- Name: audit_log_id_seq; Type: SEQUENCE SET; Schema: public; Owner: postgres
--

SELECT pg_catalog.setval('public.audit_log_id_seq', 1, false);


--
-- Name: configuracion_puntaje_id_seq; Type: SEQUENCE SET; Schema: public; Owner: postgres
--

SELECT pg_catalog.setval('public.configuracion_puntaje_id_seq', 116, true);


--
-- Name: conversaciones_id_seq; Type: SEQUENCE SET; Schema: public; Owner: postgres
--

SELECT pg_catalog.setval('public.conversaciones_id_seq', 21, true);


--
-- Name: eventos_especiales_config_id_seq; Type: SEQUENCE SET; Schema: public; Owner: postgres
--

SELECT pg_catalog.setval('public.eventos_especiales_config_id_seq', 81, true);


--
-- Name: eventos_especiales_registro_id_seq; Type: SEQUENCE SET; Schema: public; Owner: postgres
--

SELECT pg_catalog.setval('public.eventos_especiales_registro_id_seq', 96, true);


--
-- Name: formulario_campos_id_seq; Type: SEQUENCE SET; Schema: public; Owner: postgres
--

SELECT pg_catalog.setval('public.formulario_campos_id_seq', 2, true);


--
-- Name: grupos_ranking_id_seq; Type: SEQUENCE SET; Schema: public; Owner: postgres
--

SELECT pg_catalog.setval('public.grupos_ranking_id_seq', 34, true);


--
-- Name: grupos_ranking_miembros_id_seq; Type: SEQUENCE SET; Schema: public; Owner: postgres
--

SELECT pg_catalog.setval('public.grupos_ranking_miembros_id_seq', 1, false);


--
-- Name: historial_puntos_id_seq; Type: SEQUENCE SET; Schema: public; Owner: postgres
--

SELECT pg_catalog.setval('public.historial_puntos_id_seq', 178, true);


--
-- Name: insignias_id_seq; Type: SEQUENCE SET; Schema: public; Owner: postgres
--

SELECT pg_catalog.setval('public.insignias_id_seq', 110, true);


--
-- Name: mensajes_id_seq; Type: SEQUENCE SET; Schema: public; Owner: postgres
--

SELECT pg_catalog.setval('public.mensajes_id_seq', 103, true);


--
-- Name: niveles_biblicos_id_seq; Type: SEQUENCE SET; Schema: public; Owner: postgres
--

SELECT pg_catalog.setval('public.niveles_biblicos_id_seq', 194, true);


--
-- Name: notificaciones_id_seq; Type: SEQUENCE SET; Schema: public; Owner: postgres
--

SELECT pg_catalog.setval('public.notificaciones_id_seq', 1, false);


--
-- Name: partes_id_seq; Type: SEQUENCE SET; Schema: public; Owner: postgres
--

SELECT pg_catalog.setval('public.partes_id_seq', 364, true);


--
-- Name: periodos_ranking_id_seq; Type: SEQUENCE SET; Schema: public; Owner: postgres
--

SELECT pg_catalog.setval('public.periodos_ranking_id_seq', 1, true);


--
-- Name: programa_asignaciones_id_seq; Type: SEQUENCE SET; Schema: public; Owner: postgres
--

SELECT pg_catalog.setval('public.programa_asignaciones_id_seq', 90, true);


--
-- Name: programa_links_id_seq; Type: SEQUENCE SET; Schema: public; Owner: postgres
--

SELECT pg_catalog.setval('public.programa_links_id_seq', 25, true);


--
-- Name: programa_partes_id_seq; Type: SEQUENCE SET; Schema: public; Owner: postgres
--

SELECT pg_catalog.setval('public.programa_partes_id_seq', 81, true);


--
-- Name: programas_id_seq; Type: SEQUENCE SET; Schema: public; Owner: postgres
--

SELECT pg_catalog.setval('public.programas_id_seq', 5, true);


--
-- Name: qr_asistencia_id_seq; Type: SEQUENCE SET; Schema: public; Owner: postgres
--

SELECT pg_catalog.setval('public.qr_asistencia_id_seq', 4, true);


--
-- Name: roles_id_seq; Type: SEQUENCE SET; Schema: public; Owner: postgres
--

SELECT pg_catalog.setval('public.roles_id_seq', 3, true);


--
-- Name: tipos_asistencia_id_seq; Type: SEQUENCE SET; Schema: public; Owner: postgres
--

SELECT pg_catalog.setval('public.tipos_asistencia_id_seq', 78, true);


--
-- Name: usuarios_gamificacion_id_seq; Type: SEQUENCE SET; Schema: public; Owner: postgres
--

SELECT pg_catalog.setval('public.usuarios_gamificacion_id_seq', 48, true);


--
-- Name: usuarios_id_seq; Type: SEQUENCE SET; Schema: public; Owner: postgres
--

SELECT pg_catalog.setval('public.usuarios_id_seq', 841, true);


--
-- Name: usuarios_insignias_id_seq; Type: SEQUENCE SET; Schema: public; Owner: postgres
--

SELECT pg_catalog.setval('public.usuarios_insignias_id_seq', 1, false);


--
-- Name: usuarios_partes_id_seq; Type: SEQUENCE SET; Schema: public; Owner: postgres
--

SELECT pg_catalog.setval('public.usuarios_partes_id_seq', 1, false);


--
-- Name: usuarios_roles_id_seq; Type: SEQUENCE SET; Schema: public; Owner: postgres
--

SELECT pg_catalog.setval('public.usuarios_roles_id_seq', 75, true);


--
-- Name: _prisma_migrations _prisma_migrations_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public._prisma_migrations
    ADD CONSTRAINT _prisma_migrations_pkey PRIMARY KEY (id);


--
-- Name: asistencias asistencias_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.asistencias
    ADD CONSTRAINT asistencias_pkey PRIMARY KEY (id);


--
-- Name: audit_log audit_log_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.audit_log
    ADD CONSTRAINT audit_log_pkey PRIMARY KEY (id);


--
-- Name: configuracion_puntaje configuracion_puntaje_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.configuracion_puntaje
    ADD CONSTRAINT configuracion_puntaje_pkey PRIMARY KEY (id);


--
-- Name: conversaciones conversaciones_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.conversaciones
    ADD CONSTRAINT conversaciones_pkey PRIMARY KEY (id);


--
-- Name: conversaciones conversaciones_telefono_key; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.conversaciones
    ADD CONSTRAINT conversaciones_telefono_key UNIQUE (telefono);


--
-- Name: eventos_especiales_config eventos_especiales_config_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.eventos_especiales_config
    ADD CONSTRAINT eventos_especiales_config_pkey PRIMARY KEY (id);


--
-- Name: eventos_especiales_registro eventos_especiales_registro_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.eventos_especiales_registro
    ADD CONSTRAINT eventos_especiales_registro_pkey PRIMARY KEY (id);


--
-- Name: formulario_campos formulario_campos_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.formulario_campos
    ADD CONSTRAINT formulario_campos_pkey PRIMARY KEY (id);


--
-- Name: grupos_ranking_miembros grupos_ranking_miembros_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.grupos_ranking_miembros
    ADD CONSTRAINT grupos_ranking_miembros_pkey PRIMARY KEY (id);


--
-- Name: grupos_ranking grupos_ranking_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.grupos_ranking
    ADD CONSTRAINT grupos_ranking_pkey PRIMARY KEY (id);


--
-- Name: historial_puntos historial_puntos_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.historial_puntos
    ADD CONSTRAINT historial_puntos_pkey PRIMARY KEY (id);


--
-- Name: insignias insignias_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.insignias
    ADD CONSTRAINT insignias_pkey PRIMARY KEY (id);


--
-- Name: mensajes mensajes_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.mensajes
    ADD CONSTRAINT mensajes_pkey PRIMARY KEY (id);


--
-- Name: niveles_biblicos niveles_biblicos_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.niveles_biblicos
    ADD CONSTRAINT niveles_biblicos_pkey PRIMARY KEY (id);


--
-- Name: notificaciones notificaciones_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.notificaciones
    ADD CONSTRAINT notificaciones_pkey PRIMARY KEY (id);


--
-- Name: partes partes_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.partes
    ADD CONSTRAINT partes_pkey PRIMARY KEY (id);


--
-- Name: periodos_ranking periodos_ranking_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.periodos_ranking
    ADD CONSTRAINT periodos_ranking_pkey PRIMARY KEY (id);


--
-- Name: programa_asignaciones programa_asignaciones_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.programa_asignaciones
    ADD CONSTRAINT programa_asignaciones_pkey PRIMARY KEY (id);


--
-- Name: programa_links programa_links_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.programa_links
    ADD CONSTRAINT programa_links_pkey PRIMARY KEY (id);


--
-- Name: programa_partes programa_partes_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.programa_partes
    ADD CONSTRAINT programa_partes_pkey PRIMARY KEY (id);


--
-- Name: programas programas_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.programas
    ADD CONSTRAINT programas_pkey PRIMARY KEY (id);


--
-- Name: qr_asistencia qr_asistencia_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.qr_asistencia
    ADD CONSTRAINT qr_asistencia_pkey PRIMARY KEY (id);


--
-- Name: roles roles_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.roles
    ADD CONSTRAINT roles_pkey PRIMARY KEY (id);


--
-- Name: tipos_asistencia tipos_asistencia_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.tipos_asistencia
    ADD CONSTRAINT tipos_asistencia_pkey PRIMARY KEY (id);


--
-- Name: usuarios_gamificacion usuarios_gamificacion_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.usuarios_gamificacion
    ADD CONSTRAINT usuarios_gamificacion_pkey PRIMARY KEY (id);


--
-- Name: usuarios_insignias usuarios_insignias_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.usuarios_insignias
    ADD CONSTRAINT usuarios_insignias_pkey PRIMARY KEY (id);


--
-- Name: usuarios_partes usuarios_partes_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.usuarios_partes
    ADD CONSTRAINT usuarios_partes_pkey PRIMARY KEY (id);


--
-- Name: usuarios usuarios_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.usuarios
    ADD CONSTRAINT usuarios_pkey PRIMARY KEY (id);


--
-- Name: usuarios_roles usuarios_roles_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.usuarios_roles
    ADD CONSTRAINT usuarios_roles_pkey PRIMARY KEY (id);


--
-- Name: asistencias_telefono_registro_qr_id_key; Type: INDEX; Schema: public; Owner: postgres
--

CREATE UNIQUE INDEX asistencias_telefono_registro_qr_id_key ON public.asistencias USING btree (telefono_registro, qr_id);


--
-- Name: configuracion_puntaje_codigo_key; Type: INDEX; Schema: public; Owner: postgres
--

CREATE UNIQUE INDEX configuracion_puntaje_codigo_key ON public.configuracion_puntaje USING btree (codigo);


--
-- Name: conversaciones_derivada_a_id_modo_idx; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX conversaciones_derivada_a_id_modo_idx ON public.conversaciones USING btree (derivada_a_id, modo);


--
-- Name: conversaciones_modo_updated_at_idx; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX conversaciones_modo_updated_at_idx ON public.conversaciones USING btree (modo, updated_at DESC);


--
-- Name: eventos_especiales_config_codigo_key; Type: INDEX; Schema: public; Owner: postgres
--

CREATE UNIQUE INDEX eventos_especiales_config_codigo_key ON public.eventos_especiales_config USING btree (codigo);


--
-- Name: eventos_especiales_registro_usuario_gam_id_evento_config_id_fec; Type: INDEX; Schema: public; Owner: postgres
--

CREATE UNIQUE INDEX eventos_especiales_registro_usuario_gam_id_evento_config_id_fec ON public.eventos_especiales_registro USING btree (usuario_gam_id, evento_config_id, fecha);


--
-- Name: grupos_ranking_codigo_key; Type: INDEX; Schema: public; Owner: postgres
--

CREATE UNIQUE INDEX grupos_ranking_codigo_key ON public.grupos_ranking USING btree (codigo);


--
-- Name: grupos_ranking_miembros_grupo_id_idx; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX grupos_ranking_miembros_grupo_id_idx ON public.grupos_ranking_miembros USING btree (grupo_id);


--
-- Name: grupos_ranking_miembros_grupo_id_usuario_id_key; Type: INDEX; Schema: public; Owner: postgres
--

CREATE UNIQUE INDEX grupos_ranking_miembros_grupo_id_usuario_id_key ON public.grupos_ranking_miembros USING btree (grupo_id, usuario_id);


--
-- Name: grupos_ranking_miembros_usuario_id_idx; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX grupos_ranking_miembros_usuario_id_idx ON public.grupos_ranking_miembros USING btree (usuario_id);


--
-- Name: historial_puntos_fecha_idx; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX historial_puntos_fecha_idx ON public.historial_puntos USING btree (fecha);


--
-- Name: historial_puntos_usuario_gam_id_periodo_ranking_id_idx; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX historial_puntos_usuario_gam_id_periodo_ranking_id_idx ON public.historial_puntos USING btree (usuario_gam_id, periodo_ranking_id);


--
-- Name: insignias_codigo_key; Type: INDEX; Schema: public; Owner: postgres
--

CREATE UNIQUE INDEX insignias_codigo_key ON public.insignias USING btree (codigo);


--
-- Name: mensajes_conversacion_id_created_at_idx; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX mensajes_conversacion_id_created_at_idx ON public.mensajes USING btree (conversacion_id, created_at);


--
-- Name: mensajes_whatsapp_msg_id_key; Type: INDEX; Schema: public; Owner: postgres
--

CREATE UNIQUE INDEX mensajes_whatsapp_msg_id_key ON public.mensajes USING btree (whatsapp_msg_id);


--
-- Name: niveles_biblicos_nombre_key; Type: INDEX; Schema: public; Owner: postgres
--

CREATE UNIQUE INDEX niveles_biblicos_nombre_key ON public.niveles_biblicos USING btree (nombre);


--
-- Name: niveles_biblicos_numero_key; Type: INDEX; Schema: public; Owner: postgres
--

CREATE UNIQUE INDEX niveles_biblicos_numero_key ON public.niveles_biblicos USING btree (numero);


--
-- Name: partes_nombre_key; Type: INDEX; Schema: public; Owner: postgres
--

CREATE UNIQUE INDEX partes_nombre_key ON public.partes USING btree (nombre);


--
-- Name: programa_partes_programa_id_parte_id_key; Type: INDEX; Schema: public; Owner: postgres
--

CREATE UNIQUE INDEX programa_partes_programa_id_parte_id_key ON public.programa_partes USING btree (programa_id, parte_id);


--
-- Name: programas_codigo_key; Type: INDEX; Schema: public; Owner: postgres
--

CREATE UNIQUE INDEX programas_codigo_key ON public.programas USING btree (codigo);


--
-- Name: programas_fecha_key; Type: INDEX; Schema: public; Owner: postgres
--

CREATE UNIQUE INDEX programas_fecha_key ON public.programas USING btree (fecha);


--
-- Name: qr_asistencia_codigo_key; Type: INDEX; Schema: public; Owner: postgres
--

CREATE UNIQUE INDEX qr_asistencia_codigo_key ON public.qr_asistencia USING btree (codigo);


--
-- Name: roles_nombre_key; Type: INDEX; Schema: public; Owner: postgres
--

CREATE UNIQUE INDEX roles_nombre_key ON public.roles USING btree (nombre);


--
-- Name: tipos_asistencia_nombre_key; Type: INDEX; Schema: public; Owner: postgres
--

CREATE UNIQUE INDEX tipos_asistencia_nombre_key ON public.tipos_asistencia USING btree (nombre);


--
-- Name: usuarios_codigo_pais_telefono_key; Type: INDEX; Schema: public; Owner: postgres
--

CREATE UNIQUE INDEX usuarios_codigo_pais_telefono_key ON public.usuarios USING btree (codigo_pais, telefono);


--
-- Name: usuarios_gamificacion_usuario_id_key; Type: INDEX; Schema: public; Owner: postgres
--

CREATE UNIQUE INDEX usuarios_gamificacion_usuario_id_key ON public.usuarios_gamificacion USING btree (usuario_id);


--
-- Name: usuarios_insignias_usuario_gam_id_insignia_id_key; Type: INDEX; Schema: public; Owner: postgres
--

CREATE UNIQUE INDEX usuarios_insignias_usuario_gam_id_insignia_id_key ON public.usuarios_insignias USING btree (usuario_gam_id, insignia_id);


--
-- Name: usuarios_partes_usuario_id_parte_id_key; Type: INDEX; Schema: public; Owner: postgres
--

CREATE UNIQUE INDEX usuarios_partes_usuario_id_parte_id_key ON public.usuarios_partes USING btree (usuario_id, parte_id);


--
-- Name: usuarios_roles_usuario_id_rol_id_key; Type: INDEX; Schema: public; Owner: postgres
--

CREATE UNIQUE INDEX usuarios_roles_usuario_id_rol_id_key ON public.usuarios_roles USING btree (usuario_id, rol_id);


--
-- Name: asistencias asistencias_confirmado_por_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.asistencias
    ADD CONSTRAINT asistencias_confirmado_por_fkey FOREIGN KEY (confirmado_por) REFERENCES public.usuarios(id) ON UPDATE CASCADE ON DELETE SET NULL;


--
-- Name: asistencias asistencias_qr_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.asistencias
    ADD CONSTRAINT asistencias_qr_id_fkey FOREIGN KEY (qr_id) REFERENCES public.qr_asistencia(id) ON UPDATE CASCADE ON DELETE SET NULL;


--
-- Name: asistencias asistencias_tipo_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.asistencias
    ADD CONSTRAINT asistencias_tipo_id_fkey FOREIGN KEY (tipo_id) REFERENCES public.tipos_asistencia(id) ON UPDATE CASCADE ON DELETE SET NULL;


--
-- Name: asistencias asistencias_usuario_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.asistencias
    ADD CONSTRAINT asistencias_usuario_id_fkey FOREIGN KEY (usuario_id) REFERENCES public.usuarios(id) ON UPDATE CASCADE ON DELETE RESTRICT;


--
-- Name: conversaciones conversaciones_derivada_a_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.conversaciones
    ADD CONSTRAINT conversaciones_derivada_a_id_fkey FOREIGN KEY (derivada_a_id) REFERENCES public.usuarios(id) ON UPDATE CASCADE ON DELETE SET NULL;


--
-- Name: conversaciones conversaciones_programa_en_edicion_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.conversaciones
    ADD CONSTRAINT conversaciones_programa_en_edicion_fkey FOREIGN KEY (programa_en_edicion) REFERENCES public.programas(id) ON UPDATE CASCADE ON DELETE SET NULL;


--
-- Name: conversaciones conversaciones_usuario_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.conversaciones
    ADD CONSTRAINT conversaciones_usuario_id_fkey FOREIGN KEY (usuario_id) REFERENCES public.usuarios(id) ON UPDATE CASCADE ON DELETE SET NULL;


--
-- Name: eventos_especiales_registro eventos_especiales_registro_evento_config_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.eventos_especiales_registro
    ADD CONSTRAINT eventos_especiales_registro_evento_config_id_fkey FOREIGN KEY (evento_config_id) REFERENCES public.eventos_especiales_config(id) ON UPDATE CASCADE ON DELETE CASCADE;


--
-- Name: eventos_especiales_registro eventos_especiales_registro_usuario_gam_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.eventos_especiales_registro
    ADD CONSTRAINT eventos_especiales_registro_usuario_gam_id_fkey FOREIGN KEY (usuario_gam_id) REFERENCES public.usuarios_gamificacion(id) ON UPDATE CASCADE ON DELETE CASCADE;


--
-- Name: formulario_campos formulario_campos_tipo_asistencia_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.formulario_campos
    ADD CONSTRAINT formulario_campos_tipo_asistencia_id_fkey FOREIGN KEY (tipo_asistencia_id) REFERENCES public.tipos_asistencia(id) ON UPDATE CASCADE ON DELETE CASCADE;


--
-- Name: grupos_ranking grupos_ranking_creado_por_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.grupos_ranking
    ADD CONSTRAINT grupos_ranking_creado_por_id_fkey FOREIGN KEY (creado_por_id) REFERENCES public.usuarios(id) ON UPDATE CASCADE ON DELETE SET NULL;


--
-- Name: grupos_ranking_miembros grupos_ranking_miembros_agregado_por_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.grupos_ranking_miembros
    ADD CONSTRAINT grupos_ranking_miembros_agregado_por_id_fkey FOREIGN KEY (agregado_por_id) REFERENCES public.usuarios(id) ON UPDATE CASCADE ON DELETE SET NULL;


--
-- Name: grupos_ranking_miembros grupos_ranking_miembros_grupo_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.grupos_ranking_miembros
    ADD CONSTRAINT grupos_ranking_miembros_grupo_id_fkey FOREIGN KEY (grupo_id) REFERENCES public.grupos_ranking(id) ON UPDATE CASCADE ON DELETE CASCADE;


--
-- Name: grupos_ranking_miembros grupos_ranking_miembros_usuario_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.grupos_ranking_miembros
    ADD CONSTRAINT grupos_ranking_miembros_usuario_id_fkey FOREIGN KEY (usuario_id) REFERENCES public.usuarios(id) ON UPDATE CASCADE ON DELETE CASCADE;


--
-- Name: grupos_ranking grupos_ranking_periodo_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.grupos_ranking
    ADD CONSTRAINT grupos_ranking_periodo_id_fkey FOREIGN KEY (periodo_id) REFERENCES public.periodos_ranking(id) ON UPDATE CASCADE ON DELETE SET NULL;


--
-- Name: historial_puntos historial_puntos_config_puntaje_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.historial_puntos
    ADD CONSTRAINT historial_puntos_config_puntaje_id_fkey FOREIGN KEY (config_puntaje_id) REFERENCES public.configuracion_puntaje(id) ON UPDATE CASCADE ON DELETE SET NULL;


--
-- Name: historial_puntos historial_puntos_periodo_ranking_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.historial_puntos
    ADD CONSTRAINT historial_puntos_periodo_ranking_id_fkey FOREIGN KEY (periodo_ranking_id) REFERENCES public.periodos_ranking(id) ON UPDATE CASCADE ON DELETE SET NULL;


--
-- Name: historial_puntos historial_puntos_usuario_gam_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.historial_puntos
    ADD CONSTRAINT historial_puntos_usuario_gam_id_fkey FOREIGN KEY (usuario_gam_id) REFERENCES public.usuarios_gamificacion(id) ON UPDATE CASCADE ON DELETE CASCADE;


--
-- Name: mensajes mensajes_conversacion_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.mensajes
    ADD CONSTRAINT mensajes_conversacion_id_fkey FOREIGN KEY (conversacion_id) REFERENCES public.conversaciones(id) ON UPDATE CASCADE ON DELETE CASCADE;


--
-- Name: mensajes mensajes_enviado_por_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.mensajes
    ADD CONSTRAINT mensajes_enviado_por_id_fkey FOREIGN KEY (enviado_por_id) REFERENCES public.usuarios(id) ON UPDATE CASCADE ON DELETE SET NULL;


--
-- Name: notificaciones notificaciones_programa_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.notificaciones
    ADD CONSTRAINT notificaciones_programa_id_fkey FOREIGN KEY (programa_id) REFERENCES public.programas(id) ON UPDATE CASCADE ON DELETE SET NULL;


--
-- Name: notificaciones notificaciones_usuario_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.notificaciones
    ADD CONSTRAINT notificaciones_usuario_id_fkey FOREIGN KEY (usuario_id) REFERENCES public.usuarios(id) ON UPDATE CASCADE ON DELETE SET NULL;


--
-- Name: periodos_ranking periodos_ranking_cerrado_por_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.periodos_ranking
    ADD CONSTRAINT periodos_ranking_cerrado_por_id_fkey FOREIGN KEY (cerrado_por_id) REFERENCES public.usuarios(id) ON UPDATE CASCADE ON DELETE SET NULL;


--
-- Name: periodos_ranking periodos_ranking_creado_por_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.periodos_ranking
    ADD CONSTRAINT periodos_ranking_creado_por_id_fkey FOREIGN KEY (creado_por_id) REFERENCES public.usuarios(id) ON UPDATE CASCADE ON DELETE SET NULL;


--
-- Name: programa_asignaciones programa_asignaciones_parte_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.programa_asignaciones
    ADD CONSTRAINT programa_asignaciones_parte_id_fkey FOREIGN KEY (parte_id) REFERENCES public.partes(id) ON UPDATE CASCADE ON DELETE RESTRICT;


--
-- Name: programa_asignaciones programa_asignaciones_programa_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.programa_asignaciones
    ADD CONSTRAINT programa_asignaciones_programa_id_fkey FOREIGN KEY (programa_id) REFERENCES public.programas(id) ON UPDATE CASCADE ON DELETE CASCADE;


--
-- Name: programa_asignaciones programa_asignaciones_usuario_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.programa_asignaciones
    ADD CONSTRAINT programa_asignaciones_usuario_id_fkey FOREIGN KEY (usuario_id) REFERENCES public.usuarios(id) ON UPDATE CASCADE ON DELETE RESTRICT;


--
-- Name: programa_links programa_links_agregado_por_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.programa_links
    ADD CONSTRAINT programa_links_agregado_por_fkey FOREIGN KEY (agregado_por) REFERENCES public.usuarios(id) ON UPDATE CASCADE ON DELETE SET NULL;


--
-- Name: programa_links programa_links_parte_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.programa_links
    ADD CONSTRAINT programa_links_parte_id_fkey FOREIGN KEY (parte_id) REFERENCES public.partes(id) ON UPDATE CASCADE ON DELETE RESTRICT;


--
-- Name: programa_links programa_links_programa_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.programa_links
    ADD CONSTRAINT programa_links_programa_id_fkey FOREIGN KEY (programa_id) REFERENCES public.programas(id) ON UPDATE CASCADE ON DELETE CASCADE;


--
-- Name: programa_partes programa_partes_parte_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.programa_partes
    ADD CONSTRAINT programa_partes_parte_id_fkey FOREIGN KEY (parte_id) REFERENCES public.partes(id) ON UPDATE CASCADE ON DELETE RESTRICT;


--
-- Name: programa_partes programa_partes_programa_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.programa_partes
    ADD CONSTRAINT programa_partes_programa_id_fkey FOREIGN KEY (programa_id) REFERENCES public.programas(id) ON UPDATE CASCADE ON DELETE CASCADE;


--
-- Name: programas programas_creado_por_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.programas
    ADD CONSTRAINT programas_creado_por_fkey FOREIGN KEY (creado_por) REFERENCES public.usuarios(id) ON UPDATE CASCADE ON DELETE SET NULL;


--
-- Name: qr_asistencia qr_asistencia_created_by_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.qr_asistencia
    ADD CONSTRAINT qr_asistencia_created_by_fkey FOREIGN KEY (created_by) REFERENCES public.usuarios(id) ON UPDATE CASCADE ON DELETE SET NULL;


--
-- Name: qr_asistencia qr_asistencia_tipo_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.qr_asistencia
    ADD CONSTRAINT qr_asistencia_tipo_id_fkey FOREIGN KEY (tipo_id) REFERENCES public.tipos_asistencia(id) ON UPDATE CASCADE ON DELETE SET NULL;


--
-- Name: usuarios_gamificacion usuarios_gamificacion_nivel_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.usuarios_gamificacion
    ADD CONSTRAINT usuarios_gamificacion_nivel_id_fkey FOREIGN KEY (nivel_id) REFERENCES public.niveles_biblicos(id) ON UPDATE CASCADE ON DELETE RESTRICT;


--
-- Name: usuarios_gamificacion usuarios_gamificacion_usuario_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.usuarios_gamificacion
    ADD CONSTRAINT usuarios_gamificacion_usuario_id_fkey FOREIGN KEY (usuario_id) REFERENCES public.usuarios(id) ON UPDATE CASCADE ON DELETE CASCADE;


--
-- Name: usuarios_insignias usuarios_insignias_insignia_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.usuarios_insignias
    ADD CONSTRAINT usuarios_insignias_insignia_id_fkey FOREIGN KEY (insignia_id) REFERENCES public.insignias(id) ON UPDATE CASCADE ON DELETE CASCADE;


--
-- Name: usuarios_insignias usuarios_insignias_usuario_gam_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.usuarios_insignias
    ADD CONSTRAINT usuarios_insignias_usuario_gam_id_fkey FOREIGN KEY (usuario_gam_id) REFERENCES public.usuarios_gamificacion(id) ON UPDATE CASCADE ON DELETE CASCADE;


--
-- Name: usuarios_partes usuarios_partes_parte_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.usuarios_partes
    ADD CONSTRAINT usuarios_partes_parte_id_fkey FOREIGN KEY (parte_id) REFERENCES public.partes(id) ON UPDATE CASCADE ON DELETE CASCADE;


--
-- Name: usuarios_partes usuarios_partes_usuario_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.usuarios_partes
    ADD CONSTRAINT usuarios_partes_usuario_id_fkey FOREIGN KEY (usuario_id) REFERENCES public.usuarios(id) ON UPDATE CASCADE ON DELETE CASCADE;


--
-- Name: usuarios_roles usuarios_roles_asignado_por_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.usuarios_roles
    ADD CONSTRAINT usuarios_roles_asignado_por_fkey FOREIGN KEY (asignado_por) REFERENCES public.usuarios(id) ON UPDATE CASCADE ON DELETE SET NULL;


--
-- Name: usuarios_roles usuarios_roles_rol_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.usuarios_roles
    ADD CONSTRAINT usuarios_roles_rol_id_fkey FOREIGN KEY (rol_id) REFERENCES public.roles(id) ON UPDATE CASCADE ON DELETE CASCADE;


--
-- Name: usuarios_roles usuarios_roles_usuario_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.usuarios_roles
    ADD CONSTRAINT usuarios_roles_usuario_id_fkey FOREIGN KEY (usuario_id) REFERENCES public.usuarios(id) ON UPDATE CASCADE ON DELETE CASCADE;


--
-- PostgreSQL database dump complete
--

\unrestrict gdOcSdMVouAQQS98Yaj9emmjXpx8glCeoVppZJ1JVlpRYWlvDHkqtFlMVUk9gIl

