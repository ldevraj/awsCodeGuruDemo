/// <reference types="cypress" />
import {
  resetDatabase,
  visit,
  newId,
  enterTodo,
  stubMathRandom,
  makeTodo,
  getTodoItems,
  getNewTodoInput,
} from '../support/utils'

// testing the central Vuex data store
describe('UI to Vuex store', () => {
  beforeEach(resetDatabase)
  beforeEach(() => visit())

  const getStore = () => cy.window().its('app.$store')

  it('has loading, newTodo and todos properties', () => {
    // getStore().its('state').should('have.keys', ['loading', 'newTodo', 'todos'])
    getStore()
    .its('state')
    .then(Object.keys)
    .snapshot()
  })

  it('starts empty', () => {
    const omitLoading = (state) => Cypress._.omit(state, 'loading')

    getStore()
    .its('state')
    .then(omitLoading)
    .snapshot()
  })

  it('can enter new todo text', () => {
    const text = 'learn how to test with Cypress.io'

    cy.get('.todoapp')
    .find('.new-todo')
    .type(text)
    .trigger('change')

    getStore()
    .its('state.newTodo')
    .snapshot()
  })

  it('stores todos in the store', () => {
    enterTodo('first todo')
    enterTodo('second todo')

    getStore()
    .its('state.todos')
    .should('have.length', 2)

    const removeIds = (list) => list.map((todo) => Cypress._.omit(todo, 'id'))

    getStore()
    .its('state.todos')
    .then(removeIds)
    .snapshot()
  })

  const stubMathRandom = () => {
    // first two digits are disregarded, so our "random" sequence of ids
    // should be '1', '2', '3', ...
    let counter = 101

    cy.window().then((win) => {
      cy.stub(win.Math, 'random').callsFake(() => counter++)
    })
  }

  it('stores todos in the store (with ids)', () => {
    stubMathRandom()
    enterTodo('first todo')
    enterTodo('second todo')

    getStore()
    .its('state.todos')
    .should('have.length', 2)

    getStore()
    .its('state.todos')
    .snapshot()
  })
})

describe('Vuex store', {
  retries: {
    runMode: 2,
    openMode: 1,
  },
}, () => {
  beforeEach(resetDatabase)
  beforeEach(() => visit())
  beforeEach(stubMathRandom)

  // returns the entire Vuex store
  const getStore = (log = true) => cy.window({ log }).its('app.$store', { log })

  // and a helper methods because we are going to pull "todos" often
  const getStoreTodos = () => {
    // always wait for the store to finish loading
    getStore(false).its('state.loading').should('be.false')

    return getStore().its('state.todos')
  }

  it('starts empty', () => {
    getStoreTodos().snapshot()
  })

  it('can enter new todo text', () => {
    const text = 'learn how to test with Cypress.io'

    cy.get('.todoapp')
    .find('.new-todo')
    .type(text)
    .trigger('change')

    getStore().its('state.newTodo').snapshot()
  })

  it('can compare the entire store', () => {
    getStore().its('state').snapshot()
  })

  it('starts typing after delayed server response', () => {
    // this will force new todo item to be added only after a delay
    cy.intercept(
      'POST',
      '/todos',
      {
        delay: 1000,
        body: {},
      }
    )

    const title = 'first todo'

    enterTodo(title)

    const newTitleText = 'this is a second todo title, slowly typed'

    getNewTodoInput()
    .type(newTitleText, { delay: 50 })
    .trigger('change')

    getNewTodoInput().snapshot()
  })

  it('can add a todo, type and compare entire store', () => {
    const title = 'a random todo'

    enterTodo(title)

    const text = 'learn how to test with Cypress.io'

    cy.get('.todoapp')
    .find('.new-todo')
    .type(text)
    .trigger('change')

    getStore().its('state').snapshot()
  })

  it('can add a todo', () => {
    const title = `a single todo ${newId()}`

    enterTodo(title)
    getStoreTodos()
    .should('have.length', 1)
    .its('0')
    .and('have.all.keys', 'id', 'title', 'completed')
  })

  // thanks to predictable random id generation
  // we know the objects in the todos list
  it('can add a particular todo', () => {
    const title = `a single todo ${newId()}`

    enterTodo(title)
    getStoreTodos().snapshot()
  })

  it('can add two todos and delete one', () => {
    const first = makeTodo()
    const second = makeTodo()

    enterTodo(first.title)
    enterTodo(second.title)

    getTodoItems()
    .should('have.length', 2)
    .first()
    .find('.destroy')
    .click({ force: true })

    getTodoItems().should('have.length', 1)

    getStoreTodos().snapshot()
  })

  it('can be driven by dispatching actions', () => {
    getStore().then((store) => {
      store.dispatch('setNewTodo', 'a new todo')
      store.dispatch('addTodo')
      store.dispatch('clearNewTodo')
    })

    // assert UI
    getTodoItems()
    .should('have.length', 1)
    .first()
    .contains('a new todo')

    // make sure the store is done loading
    getStore(false).its('state.loading').should('be.false')

    // then snapshot it
    getStore().its('state').snapshot()
  })
})

describe('Store actions', {
  retries: {
    runMode: 2,
    openMode: 1,
  },
}, () => {
  const getStore = () => cy.window().its('app.$store')

  beforeEach(resetDatabase)
  beforeEach(() => visit())
  beforeEach(stubMathRandom)

  it('changes the state', () => {
    getStore().then((store) => {
      store.dispatch('setNewTodo', 'a new todo')
      store.dispatch('addTodo')
      store.dispatch('clearNewTodo')
    })

    // Wait for the store to finish loading
    getStore().its('state.loading').should('be.false')

    // And then snapshot it
    getStore().its('state').snapshot()
  })

  it('changes the state after delay', () => {
    // this will force store action "setNewTodo" to commit
    // change to the store only after a second
    cy.intercept(
      'POST',
      '/todos',
      {
        delay: 1000,
        body: {},
      }
    ).as('post')

    getStore().then((store) => {
      store.dispatch('setNewTodo', 'a new todo')
      store.dispatch('addTodo')
      store.dispatch('clearNewTodo')
    })

    getStore()
    .its('state.todos')
    .should('have.length', 1)

    // Wait for the store to finish loading
    getStore().its('state.loading').should('be.false')

    // And then snapshot it
    getStore().its('state').snapshot()
  })

  it('changes the ui', () => {
    getStore().then((store) => {
      store.dispatch('setNewTodo', 'a new todo')
      store.dispatch('addTodo')
      store.dispatch('clearNewTodo')
    })

    // assert UI
    getTodoItems()
    .should('have.length', 1)
    .first()
    .contains('a new todo')
  })

  it('calls server', () => {
    cy.intercept('POST', '/todos').as('postTodo')

    getStore().then((store) => {
      store.dispatch('setNewTodo', 'a new todo')
      store.dispatch('addTodo')
      store.dispatch('clearNewTodo')
    })

    // assert server call
    cy.wait('@postTodo')
    .its('request.body')
    .snapshot()
  })

  it('calls server with delay', () => {
    cy.intercept(
      'POST',
      '/todos',
      {
        delay: 1000,
        body: {},
      }
    ).as('postTodo')

    getStore().then((store) => {
      store.dispatch('setNewTodo', 'a new todo')
      store.dispatch('addTodo')
      store.dispatch('clearNewTodo')
    })

    // assert server call - will wait a second until stubbed server responds
    cy.wait('@postTodo')
    .its('request.body')
    .snapshot()
  })
})
